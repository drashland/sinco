import { Protocol as ProtocolClass } from "./protocol.ts";
import { deferred, Protocol as ProtocolTypes, readLines } from "../deps.ts";
import { Page } from "./page.ts";
import type { Browsers } from "./types.ts";

export interface BuildOptions {
  debuggerPort?: number; // The port to start the debugger on for Chrome, so that we can connect to it. Defaults to 9292
  hostname?: string; // The hostname the browser process starts on. If on host machine, this will be "localhost", if in docker, it will bee the container name. Defaults to localhost
  binaryPath?: string; //The Full Path to the browser binary. If using an alternative chromium based browser, this field is necessary.
}

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
    return new Client(protocol);
  }
}
