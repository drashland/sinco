import { Protocol as ProtocolClass } from "./protocol.ts";
import { deferred, Protocol as ProtocolTypes, readLines } from "../deps.ts";
import { Page } from "./page.ts";
import type { Browsers } from "./types.ts";

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

/**
 * A way to interact with the headless browser instance.
 *
 * This is the entrypoint API to creating and interacting with the chrome or
 * firefox browser. It allows:
 *   - Starting the headless browser (subprocess)
 *   - Methods to interact with the client such as:
 *     - Visiting a page and returning a `Page` class
 *       to interact with that page.
 *
 * @example
 * ```js
 * const client = await Client.create([
 *   "chrome", "--headless",
 * ], {
 *   hostname: "localhost",
 *   port: 1234
 * }, "chrome", undefined);
 * const page = await client.goTo("https://drash.land");
 * ```
 */
export class Client {
  #protocol: ProtocolClass;
  constructor(
    protocol: ProtocolClass,
  ) {
    this.#protocol = protocol;
  }

  /**
   * Close/stop the sub process, and close the ws connection. Must be called when finished with all your testing
   */
  public async done() {
    await this.#protocol.done();
  }

  /**
   * Go to a specific page
   *
   * @param urlToVisit - The page to go to
   *
   * @returns A page instance, with methods to help you directly interact with the page
   */
  public async goTo(urlToVisit: string): Promise<Page> {
    const method = "Page.loadEventFired";
    this.#protocol.notification_resolvables.set(method, deferred());
    const notificationPromise = this.#protocol.notification_resolvables.get(
      method,
    );
    const res = await this.#protocol.sendWebSocketMessage<
      ProtocolTypes.Page.NavigateRequest,
      ProtocolTypes.Page.NavigateResponse
    >(
      "Page.navigate",
      {
        url: urlToVisit,
      },
    );
    await notificationPromise;
    if (res.errorText) {
      await this.#protocol.done(
        `${res.errorText}: Error for navigating to page "${urlToVisit}"`,
      );
    }
    return new Page(this.#protocol);
  }

  /**
   * Wait for anchor navigation. Usually used when typing into an input field
   */
  // public async waitForAnchorChange(): Promise<void> {
  //   const notificationPromise = this
  //     .notification_resolvables["Page.navigatedWithinDocument"] = deferred();
  //   await notificationPromise;
  //   delete this.notification_resolvables["Page.navigatedWithinDocument"];
  // }

  /**
   * Creates the instant and protocol to interact with
   *
   * @param buildArgs - Sub process args, should be ones to run chrome
   * @param wsOptions - Hostname and port to run the websocket server on
   * @param browser - Which browser we are building
   * @param firefoxProfilePath - If firefox, the path to the temporary profile location
   *
   * @returns A client instance, ready to be used
   */
  static async create(
    buildArgs: string[],
    wsOptions: {
      hostname: string;
      port: number;
    },
    browser: Browsers,
    firefoxProfilePath?: string,
  ): Promise<Client> {
    const browserProcess = Deno.run({
      cmd: buildArgs,
      stderr: "piped",
      stdout: "piped",
    });
    // Oddly, this is needed before the json/list endpoint is up.
    // but the ws url provided here isn't the one we need
    for await (const line of readLines(browserProcess.stderr)) {
      const match = line.match(/^DevTools listening on (ws:\/\/.*)$/);
      if (!match) {
        continue;
      }
      break;
    }
    const { debugUrl: wsUrl, frameId } = await ProtocolClass.getWebSocketInfo(
      wsOptions.hostname,
      wsOptions.port,
    );
    const websocket = new WebSocket(wsUrl);
    const promise = deferred();
    websocket.onopen = () => promise.resolve();
    await promise;
    const protocol = new ProtocolClass(
      websocket,
      browserProcess,
      browser,
      frameId,
      firefoxProfilePath,
    );
    await protocol.sendWebSocketMessage("Page.enable");
    await protocol.sendWebSocketMessage("Runtime.enable");
    await protocol.sendWebSocketMessage("Log.enable");
    return new Client(protocol);
  }
}
