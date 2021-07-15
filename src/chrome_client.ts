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

import { deferred, readLines } from "../deps.ts";
import { Client } from "./client.ts"
import { exists } from "./utility.ts";

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

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  public static async build(options: BuildOptions = {}): Promise<Client> {
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
    const TempChromeClient = new Client(socket, browserProcess);
    await TempChromeClient.sendWebSocketMessage("Page.enable");
    // Return the client :)
    return new Client(socket, browserProcess);
  }
}
