// https://stackoverflow.com/questions/50395719/firefox-remote-debugging-with-websockets
// FYI for reference, we can connect using websockets, but severe lack of documentation gives us NO info on how to proceed after:
/**
 * $ <firefox binary> --profile <profile> --headless --remote-debugging-port 1448
 * ```ts
 * const res = await fetch("http://localhost:1448/json/list")
 * const json = await res.json()
 * consy url = json[json.length - 1]["webSocketDebuggerUrl"]
 * const c = new WebSocket(url)
 * ```
 */

import { assertEquals, readLines, deferred } from "../deps.ts";
import { Client } from "./client.ts"

// Talking as EB: There are many packets we receieve which do not mean anything to us, and to avoid bloating any logging or trying to handle events we would never use, we store them here.
// This was originally taken from an npm modules called "foxr", but I have added on to it.
// The ones added by me, were added because when debugging, i found us picking up those events and trying to do something with them, but we had no use, so we ended p discarding that event,
// this bloated the debugging process.
const UNSOLICITED_EVENTS = [
  "styleApplied",
  "propertyChange",
  "networkEventUpdate",
  "networkEvent",
  "propertyChange",
  "newMutations",
  "appOpen",
  "appClose",
  "appInstall",
  "appUninstall",
  "frameUpdate",
  "tabListChanged",
  "consoleAPICall",
];
const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface Tab {
  actor: string; // eg "server1.conn18.tabDescriptor1",
  browserContextID: number;
  isZombieTab: boolean;
  outerWindowId: number;
  selected: true; // If this is the web page we are viewing
  title: string; // Title of the web page
  traits: {
    isBrowsingContext: true;
  };
  url: string; // eg "https://chromestatus.com/features"
  consoleActor: string;
  inspectorActor: string;
  styleSheetsActor: string;
  storageActor: string;
  memoryActor: string;
  framerateActor: string;
  reflowActor: string;
  cssPropertiesActor: string;
  performanceActor: string;
  animationsActor: string;
  responsiveActor: string;
  contentViewerActor: string;
  webExtensionInspectedWindowActor: string;
  accessibilityActor: string;
  screenshotActor: string;
  changesActor: string;
  webSocketActor: string;
  eventSourceActor: string;
  manifestActor: string;
  networkContentActor: string;
  screenshotContentActor: string;
}

interface ListTabsResponse {
  tabs: Array<Tab>;
}

interface Packet {
  from: string;
  type?: string; // Not always present, but this is very rare. An example is the response when we send a evaluateJSAsync message,
  // deno-lint-ignore no-explicit-any Packets can contain various types
  [key: string]: any; // Packets differ a lot, they can have a single extra prop that is an object and contains lots of child props with varying types, or it can contain many props.  See below:
  // {
  //   type: "networkEventUpdate",
  //   updateType: "eventTimings",
  //   totalTime: 0,
  //   from: "server1.conn1.netEvent831"
  // }
  // OR
  // {
  //   type: "evaluationResult",
  //       resultID: "1613947364381-1",
  //     hasException: false,
  //     input: "(function () { return window.location.href }).apply(window, [])",
  //     result: "https://chromestatus.com/features/schedule",
  //     startTime: 1613947364381,
  //     timestamp: 1613947364394,
  //     from: "server1.conn1.child3/consoleActor2"
  // }
}

export interface BuildOptions {
  hostname?: string; // Hostname for our connection to connect to. Can be "0.0.0.0" or "your_container_name"
  debuggerServerPort?: number; // Port for the debug server to listen on, which our connection will connect to
  defaultUrl?: string; // The default url the browser will open when ran
  binaryPath?: string; //The Full Path to the browser binary. If using an alternative Gecko based browser, this field is necessary.
}

export const defaultBuildOptions = {
  hostname: Deno.build.os === "windows" ? "127.0.0.1" : "0.0.0.0",
  debuggerServerPort: 9293,
  defaultUrl: "https://developer.mozilla.org/",
};

/**
   * Get full path to the firefox binary on the user'ss filesystem.
   * Thanks to [caspervonb](https://github.com/caspervonb/deno-web/blob/master/browser.ts)
   *
   * @returns the path
   */
export function getFirefoxPath(): string {
  switch (Deno.build.os) {
    case "darwin":
      return "/Applications/Firefox.app/Contents/MacOS/firefox";
    case "linux":
      return "/usr/bin/firefox";
    case "windows":
      return "C:\\Program Files\\Mozilla Firefox\\firefox.exe";
  }
}

/**
 * @example
 *
 *     const Firefox = await FirefoxClient.build()
 *     await Firefox.<api_method>
 */
export class FirefoxClient extends Client {
  /**
   * The connection to our headless browser
   */
  private readonly websocket: WebSocket;

  /**
   * The browser process that is running the headless browser
   */
  private readonly browser_process: Deno.Process;

  /**
   * Holds messages that we need, but was sent along another useful packet in a message,
   * so store it here to be returned next time we request a packet
   */
  private incoming_message_queue: Packet[] = [];

  /**
   * @param configs - Used to provide an API that can communicate with the headless browser
   */
  constructor(websocket: WebSocket, browserProcess: Deno.Process) {
    super()
    this.websocket = websocket;
    this.browser_process = browserProcess;
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Entry point for creating a headless firefox browser.
   * Creates a dev profile to be used by Firefox, creates the headless browser and sets up the connection to
   *
   * @param buildOptions - Any extra options you wish to provide to customise how the headless browser sub process is ran
   *   - hostname: Defaults to 0.0.0.0 for macos/linux, 127.0.0.1 for windows
   *   - port: Defaults to 9293
   *   - url: Defaults to https://developer.mozilla.org/
   *
   * @returns An instance of FirefoxClient, that is now ready.
   */
  public static async build(
    buildOptions: BuildOptions = {},
  ): Promise<FirefoxClient> {
    // Setup the options to defaults if required
    if (!buildOptions.hostname) {
      buildOptions.hostname = defaultBuildOptions.hostname;
    }
    if (!buildOptions.debuggerServerPort) {
      buildOptions.debuggerServerPort = defaultBuildOptions.debuggerServerPort;
    }
    if (!buildOptions.defaultUrl) {
      buildOptions.defaultUrl = defaultBuildOptions.defaultUrl;
    }
    // Get the path to the users firefox binary
    const firefoxPath = buildOptions.binaryPath || getFirefoxPath();
    // Create the profile the browser will use. Create a test one so we can enable required options to enable communication with it                                                                                
    const tmpDirName = await Deno.makeTempDir();
    console.log(tmpDirName)                                                                                                                                                                   
    // Create the arguments we will use when spawning the headless browser
    const args = [
      "--start-debugger-server",
      buildOptions.debuggerServerPort.toString(),
      "--headless",
      "--remote-debugging-port",
      buildOptions.debuggerServerPort.toString(),
      '-profile',tmpDirName,
      "-no-remote",
      "-foreground",
      "about:blank"
    ];
    // Create the sub process to start the browser
    console.log([firefoxPath, ...args].join(" "))
    const browserProcess = Deno.run({
      cmd: [firefoxPath, ...args],
      stderr: "piped",
      stdout: "piped",
    });
    let wsUrl = ""
    for await (const line of readLines(browserProcess.stderr)) {
      const match = line.match(/^DevTools listening on (ws:\/\/.*)$/);
      console.log(line)
      if (!match) {
        continue
      }
      wsUrl = match![1]
      break
    }
    console.log('got match :): ' + wsUrl)
    const WSURL = await this.getWebSocketUrl(buildOptions.hostname, buildOptions.debuggerServerPort)
    console.log('got ws url:' + wsUrl)
    let websocket = new WebSocket(WSURL)
    const promise = deferred()
    websocket.onopen = () => promise.resolve()
    websocket.onerror = (e: any) => {
      console.log(e.message)
      websocket = new WebSocket(wsUrl)
    }
    await promise
    websocket.onmessage = (e) => {
      console.log(e.data)
    }
    // Get actor (tab) that we use to interact with
    const TempFirefoxClient = new FirefoxClient(
      websocket,
      browserProcess,
    );
    console.log('gonna send data')
    const message = {
      method: "Target.getBrowserContexts"
    }
    websocket.send(JSON.stringify(Object.assign({}, message, {id: 2})));
    websocket.send(JSON.stringify({
      method: "Page.enable", // or target.enable?
      id: 3
    }))
    websocket.send(JSON.stringify({
      method: "Page.navigate",
      id: 4,
      params: {
        url: "https://drash.land"
      }
    }))
    websocket.send(JSON.stringify({
      method: "Runtime.evaluate",
      params: {
        expression: "window.location"
      },
      id: 5
    }))
    // Return the client :)
    return new FirefoxClient(
      websocket,browserProcess,
    );
  }
}
