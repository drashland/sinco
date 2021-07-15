// https://peter.sh/experiments/chromium-command-line-switches/

// Success response
// switch (result.result.type) {
//   case "object":
//     console.log('Result is an object')
//     break
//   case "string":
//     console.log("Result is a string")
//     break
//   case "undefined":
//     console.log('Command output returned undefined')
//     break
//   default:
//     throw new Error("Unhandled result type: " + result["result"]["type"])
// }

import { assertEquals, Deferred, deferred, readLines } from "../deps.ts";
import { Client } from "./client.ts"
import { exists } from "./utility.ts";

interface MessageResponse { // For when we send an event to get one back, eg running a JS expression
  id: number;
  result?: unknown; // Present on success
  error?: unknown; // Present on error
}

interface NotificationResponse { // Not entirely sure when, but when we send the `Network.enable` method
  method: string;
  params: unknown;
}

type SuccessResult = {
  value?: string | boolean; // only present if type is a string or boolean
  type: string; // the type of result that the `value` will be, eg object or string or boolean, ,
  className: string; // eg Location if command is `window.location`, only present when type is object
  description: string; // eg Location if command is `window.location`, only present when type is object
  objectId: string; // only present when type is object, eg '{"injectedScriptId":2,"id":2}'
};

type UndefinedResult = { // not sure when this happens, but i believe it to be when the result of a command is undefined, for example if a command is `window.loction`
  type: string; // undefined
};

type Exception = {
  className: string; // eg SyntaxError
  description: string; // eg SyntaxError: Uncaught identifier
  objectId: string; // only present when type is object, eg '{"injectedScriptId":2,"id":2}'
  subtype: string; // eg error
  type: string; // eg object
};
type ExceptionDetails = { // exists when an error
  columnNumber: number;
  exception: Exception;
  exceptionId: number;
  lineNumber: number;
  scriptId: string; // eg "12"
  text: string; // eg Uncaught
};

type DOMOutput = {
  result: SuccessResult | Exception | UndefinedResult;
  exceptionDetails?: ExceptionDetails; // exists when an error, but an undefined response value wont trigger it, for example if the command is `window.location`, there is no `exceptionDetails` property, but if the command is `window.` (syntax error), this prop will exist
};

const webSocketIsDonePromise = deferred();

export interface BuildOptions {
  debuggerPort?: number; // The port to start the debugger on for Chrome, so that we can connect to it. Defaults to 9292
  defaultUrl?: string; // Default url chrome will open when it is ran. Defaults to "https://chromestatus.com"
  hostname?: string; // The hostname the browser process starts on. If on host machine, this will be "localhost", if in docker, it will bee the container name. Defaults to localhost
  binaryPath?: string; //The Full Path to the browser binary. If using an alternative chromium based browser, this field is necessary.
}

/**
   * Gets the full path to the chrome executable on the users filesystem
   *
   * @returns The path to chrome
   */
export async function getChromePath(): Promise<string> {
  const paths = {
    // deno-lint-ignore camelcase
    windows_chrome_exe:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    // deno-lint-ignore camelcase
    windows_chrome_exe_x86:
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    linux: "/usr/bin/google-chrome",
  };
  let chromePath = "";
  switch (Deno.build.os) {
    case "darwin":
      chromePath = paths.darwin;
      break;
    case "windows":
      if (await exists(paths.windows_chrome_exe)) {
        chromePath = paths.windows_chrome_exe;
        break;
      }
      if (await exists(paths.windows_chrome_exe_x86)) {
        chromePath = paths.windows_chrome_exe_x86;
        break;
      }

      throw new Error(
        "Cannot find path for chrome in windows. Submit an issue if you encounter this error",
      );
    case "linux":
      chromePath = paths.linux;
      break;
  }
  return chromePath;
}

export class ChromeClient extends Client {

  /**
   * Our web socket connection to the remote debugging port
   */
  private readonly socket: WebSocket;

  /**
   * A counter that acts as the message id we use to send as part of the event data through the websocket
   */
  private next_message_id = 1;
  private frame_id = null;

  /**
   * To keep hold of promises waiting for a notification from the websocket
   */
  private notification_resolvables: { [key: string]: Deferred<void> } = {};

  /**
   * Track if we've closed the sub process, so we dont try close it when it already has been
   */
  private browser_process_closed = false;

  /**
   * To keep hold of our promises waiting for messages from the websocket
   */
  private resolvables: { [key: number]: Deferred<unknown> } = {};

  constructor(socket: WebSocket, browserProcess: Deno.Process) {
    super(socket, browserProcess)
    this.socket = socket;
    // Register error listener
    this.socket.onerror = function () {
      webSocketIsDonePromise.resolve();
    };
    // Register on message listenerr
    this.socket.onmessage = (msg) => {
      // 2nd part of the dirty fix 1
      const data = JSON.parse(msg.data);
      if (data.method === "Page.frameStartedLoading") {
        this.frame_id = data.params.frameId;
      }
      if (data.id && data.id === -1) {
        this.socket!.close();
      } else {
        //this.handleSocketMessage(msg);
      }
    };
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  public static async build(options: BuildOptions = {}) {
    // Setup build options
    if (!options.debuggerPort) {
      options.debuggerPort = 9292;
    }
    if (!options.defaultUrl) {
      options.defaultUrl = "https://chromestatus.com";
    }
    if (!options.hostname) {
      options.hostname = "localhost";
    }

    // Create the sub process
    const chromePath = options.binaryPath || await getChromePath();
    const browserProcess = Deno.run({
      cmd: [
        chromePath,
        "--headless",
        "--remote-debugging-port=" + options.debuggerPort,
        "--disable-gpu",
        "--no-sandbox",
        options.defaultUrl,
      ],
      stderr: "piped", // so stuff isn't displayed in the terminal for the user
    });
    // Wait until browser is ready
    for await (
      const line of readLines(browserProcess.stderr)
    ) {
      if (line.indexOf("DevTools listening on ws://") > -1) {
        break;
      }
    }
    // Connect our websocket
    // @ts-ignore
    const debugUrl = await this.getWebSocketUrl(
      options.hostname,
      options.debuggerPort,
    );
    const socket = new WebSocket(debugUrl);
    // Wait until its open
    const promise = deferred();
    socket.onopen = function () {
      promise.resolve();
    };
    await promise;
    // Create tmp chrome client and enable page notifications, so we can wait for page events, such as when a page has loaded
    const TempChromeClient = new ChromeClient(socket, browserProcess);
    //await TempChromeClient.sendWebSocketMessage("Page.enable");
    // Return the client :)
    return new ChromeClient(socket, browserProcess);
  }
}
