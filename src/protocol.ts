import { Deferred, deferred } from "../deps.ts";
import { existsSync } from "./utility.ts";
import type { Browsers } from "./types.ts";

interface MessageResponse { // For when we send an event to get one back, eg running a JS expression
  id: number;
  result?: Record<string, unknown>; // Present on success, OR for example if we  use goTo and the url doesnt exist (in firefox)
  error?: unknown; // Present on error
}

interface NotificationResponse { // Not entirely sure when, but when we send the `Network.enable` method
  method: string;
  params: unknown;
}

export class Protocol {
  /**
   * Our web socket connection to the remote debugging port
   */
  public socket: WebSocket;

  /**
   * The sub process that runs headless chrome
   */
  public browser_process: Deno.Process;

  /**
   * What browser we running?
   */
  public browser: Browsers;

  public frame_id: string;

  /**
   * A counter that acts as the message id we use to send as part of the event data through the websocket
   */
  public next_message_id = 1;

  /**
   * To keep hold of our promises waiting for messages from the websocket
   */
  public resolvables: Map<number, Deferred<unknown>> = new Map();

  /**
   * To keep hold of promises waiting for a notification from the websocket
   */
  public notification_resolvables: Map<string, Deferred<void>> = new Map();

  /**
   * Only if the browser is firefox, is this present.
   * This is the path to the directory that firefox uses
   * to write a profile
   */
  public firefox_profile_path: string | undefined = undefined;

  /**
   * Track if we've closed the sub process, so we dont try close it when it already has been
   */
  public browser_process_closed = false;

  constructor(
    socket: WebSocket,
    browserProcess: Deno.Process,
    browser: Browsers,
    frameId: string,
    firefoxProfilePath: string | undefined,
  ) {
    this.socket = socket;
    this.browser_process = browserProcess;
    this.browser = browser;
    this.frame_id = frameId;
    this.firefox_profile_path = firefoxProfilePath;
    // Register on message listener
    this.socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === "Page.frameStartedLoading") {
        this.frame_id = data.params.frameId;
      }
      this.#handleSocketMessage(data);
    };
  }

  /**
   * Close/stop the sub process, and close the ws connection. Must be called when finished with all your testing
   *
   * @param errMsg - If supplied, will finally throw an error with the message after closing all processes
   */
  public async done(errMsg?: string): Promise<void> {
    // Say a user calls an assertion method, and then calls done(), we make sure that if
    // the subprocess is already closed, dont try close it again
    if (this.browser_process_closed === true) {
      return;
    }
    const clientIsClosed = deferred();
    this.socket.onclose = () => clientIsClosed.resolve();
    // cloing subprocess will also close the ws endpoint
    this.browser_process.stderr!.close();
    this.browser_process.stdout!.close();
    this.browser_process.close();
    this.browser_process_closed = true;
    // Zombie processes is a thing with Windows, the firefox process on windows
    // will not actually be closed using the above.
    // Related Deno issue: https://github.com/denoland/deno/issues/7087
    if (this.browser === "firefox" && Deno.build.os === "windows") {
      const p = Deno.run({
        cmd: ["taskkill", "/F", "/IM", "firefox.exe"],
        stdout: "null",
        stderr: "null",
      });
      await p.status();
      p.close();
    }
    await clientIsClosed; // done AFTER the above conditional because the process is still running, so the client is never closed
    if (this.firefox_profile_path) {
      // On windows, this block is annoying. We either get a perm denied or
      // resource is in use error (classic windows). So what we're doing here is
      // even if one of those errors are thrown, keep trying because what i've (ed)
      // found is, it seems to need a couple seconds to realise that the dir
      // isnt being used anymore. The loop shouldn't be needed for macos/unix though, so
      // it will likely only run once.
      while (existsSync(this.firefox_profile_path)) {
        try {
          Deno.removeSync(this.firefox_profile_path, { recursive: true });
        } catch (_e) {
          // Just try removing again
        }
      }
    }
    if (errMsg) {
      throw new Error(errMsg);
    }
  }

  /**
   * Main method to handle sending messages/events to the websocket endpoint.
   *
   * @param method - Any DOMAIN, see sidebar at https://chromedevtools.github.io/devtools-protocol/tot/, eg Runtime.evaluate, or DOM.getDocument
   * @param params - Parameters required for the domain method
   *
   * @returns
   */
  public async sendWebSocketMessage<RequestType, ResponseType>(
    method: string,
    params?: RequestType,
  ): Promise<ResponseType> {
    const data: {
      id: number;
      method: string;
      params?: RequestType;
    } = {
      id: this.next_message_id++,
      method: method,
    };
    if (params) data.params = params;
    const promise = deferred<ResponseType>();
    this.resolvables.set(data.id, promise);
    this.socket.send(JSON.stringify(data));
    const result = await promise;
    this.resolvables.delete(data.id);
    return result;
  }

  /**
   * Gets the websocket url we use to create a ws client with.
   * Requires the headless chrome process to be running, as
   * this is what actually starts the remote debugging url
   *
   * @param hostname - The hostname to fetch from
   * @param port -  The port for the hostname to fetch from
   *
   * @returns The url to connect to
   */
  public static async getWebSocketInfo(
    hostname: string,
    port: number,
  ): Promise<{ debugUrl: string; frameId: string }> {
    let debugUrl = "";
    let frameId = "";
    while (debugUrl === "") {
      try {
        const res = await fetch(`http://${hostname}:${port}/json/list`);
        const json = await res.json();
        debugUrl = json[0]["webSocketDebuggerUrl"];
        frameId = json[0]["id"];
      } catch (_err) {
        // do nothing, loop again until the endpoint is ready
      }
    }
    return {
      debugUrl,
      frameId,
    };
  }

  #handleSocketMessage(
    message: MessageResponse | NotificationResponse,
  ) {
    if ("id" in message) { // message response
      const resolvable = this.resolvables.get(message.id);
      if (resolvable) {
        if ("result" in message) { // success response
          if ("errorText" in message.result!) {
            const r = this.notification_resolvables.get("Page.loadEventFired");
            if (r) {
              r.resolve();
            }
          }
          resolvable.resolve(message.result);
        }
        if ("error" in message) { // error response
          resolvable.resolve(message.error);
        }
      }
    }
    if ("method" in message) { // Notification response
      const resolvable = this.notification_resolvables.get(message.method);
      if (resolvable) {
        resolvable.resolve();
      }
    }
  }
}
