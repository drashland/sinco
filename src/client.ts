import { Protocol as ProtocolClass } from "./protocol.ts";
import {
  Deferred,
  deferred,
  Protocol as ProtocolTypes,
  readLines,
} from "../deps.ts";
import { Page } from "./page.ts";
import type { Browsers } from "./types.ts";
import { existsSync } from "./utility.ts";

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
 * const { browser, page } = await Client.create([
 *   "chrome", "--headless",
 * ], {
 *   hostname: "localhost",
 *   port: 1234
 * }, "chrome", undefined);
 * ```
 */
export class Client {
  /**
   * Whilst we don't be using this like a page would, it is used
   * as a 'general' protocol, not specific to pages, but maybe
   * to get targets, or general information of the overal browser
   */
  readonly #protocol: ProtocolClass;

  /**
   * The sub process that runs headless chrome
   */
  readonly #browser_process: Deno.Process;

  /**
   * Track if we've closed the sub process, so we dont try close it when it already has been
   */
  #browser_process_closed = false;

  /**
   * What browser we running?
   */
  readonly browser: Browsers;

  #pages: Page[] = [];

  /**
   * Only if the browser is firefox, is this present.
   * This is the path to the directory that firefox uses
   * to write a profile
   */
  readonly #firefox_profile_path?: string;

  constructor(
    protocol: ProtocolClass,
    browserProcess: Deno.Process,
    browser: Browsers,
    firefoxProfilePath?: string,
  ) {
    this.#protocol = protocol;
    this.#browser_process = browserProcess;
    this.browser = browser;
    this.#firefox_profile_path = firefoxProfilePath;
  }

  /**
   * Only for internal use. No documentation or help
   * will be provided to users regarding this method
   * 
   * This was only created so we could make `pages` property private,
   * but still allow the Page class to remove a page from the list
   * 
   * @param page 
   */
  public _popPage(pageTargetId: string) {
    this.#pages = this.#pages.filter(page =>
      page.target_id !== pageTargetId
    );
  }

  /**
   * A way to get a page. Useful if a new tab/page has opened
   * 
   * @example
   * ```js
   * const { browser, page } = await buildFor("chrome");
   * console.log(await browser.page(1)); // Your initial page, exactly what `page` above is
   * // You middle click an element
   * console.log(await browser.page(2)); // will return a Page representation of the newly opened page
   * ```
   * 
   * @param i 
   * @returns 
   */
  public async page(pageNumber: number): Promise<Page> {
    // `i` is given to us in a way that makes the user understand exactly what page they want.
    // If 1, they want the first page, so we will get the 0th index
    const index = pageNumber - 1

    if (!this.#pages[index]) {
      await this.close()
      throw new RangeError('You have request to get page number ' + pageNumber + ', but only ' + this.#pages.length + ' pages are opened. If the issue persists, please submit an issue.')
    }
    return this.#pages[index]
  }

  /**
   * Close/stop the sub process, and close the ws connection. Must be called when finished with all your testing
   *
   * @param errMsg - If provided, after closing, will throw an error with the message. Useful for throwing errors but making sure all resources are closed beforehand
   */
  public async close(errMsg?: string) {
    // Say a user calls an assertion method, and then calls done(), we make sure that if
    // the subprocess is already closed, dont try close it again
    if (this.#browser_process_closed === true) {
      return;
    }
    // Create promises for each ws conn
    const pList: Deferred<void>[] = [];
    for (const _page of this.#pages) {
      pList.push(deferred());
    }
    pList.push(deferred());
    for (const i in this.#pages) {
      this.#pages[i].socket.onclose = () => pList[i].resolve();
    }
    this.#protocol.socket.onclose = () => pList.at(-1)?.resolve();
    this.#browser_process.stderr!.close();
    this.#browser_process.stdout!.close();
    this.#browser_process.close();
    this.#browser_process_closed = true;
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
    for (const p of pList) {
      await p;
    }
    if (this.#firefox_profile_path) {
      // On windows, this block is annoying. We either get a perm denied or
      // resource is in use error (classic windows). So what we're doing here is
      // even if one of those errors are thrown, keep trying because what i've (ed)
      // found is, it seems to need a couple seconds to realise that the dir
      // isnt being used anymore. The loop shouldn't be needed for macos/unix though, so
      // it will likely only run once.
      while (existsSync(this.#firefox_profile_path)) {
        try {
          Deno.removeSync(this.#firefox_profile_path, { recursive: true });
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
   * Will close every tab/page that isn't the one passed in.
   * Useful if for some reason, a site has opened multiple tabs that you will not use
   *
   * @param page - The page to not close
   */
  public async closeAllPagesExcept(page: Page) {
    const targets = await this.#protocol.sendWebSocketMessage<
      null,
      ProtocolTypes.Target.GetTargetsResponse
    >("Target.getTargets");
    const pagesToClose = targets.targetInfos.filter((target) =>
      target.targetId !== page.target_id
    );
    for (const target of pagesToClose) {
      // Remove the actual page from the browser
      await this.#protocol.sendWebSocketMessage<
        ProtocolTypes.Target.CloseTargetRequest,
        ProtocolTypes.Target.CloseTargetResponse
      >("Target.closeTarget", {
        targetId: target.targetId,
      });
      // Cut all connections we have to tha page
      const page = this.#pages.find(page =>
        page.target_id === target.targetId
      );
      if (!page) {
        continue;
      }
      const p = deferred();
      page.socket.onclose = () => p.resolve();
      // page.socket.close()
      await p;
      this.#pages = this.#pages.filter(page =>
        page.target_id !== target.targetId
      );
    }
  }

  /**
   * Creates the instant and protocol to interact with, and a Page
   * instance, representing a placeholder page we opened for you
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
  ): Promise<{
    browser: Client;
    page: Page;
  }> {
    // Check port is available first because we'll only know when we run the subprocess
    // as it will show in the stderr, but will just hang
    try {
      const listener = Deno.listen({
        hostname: wsOptions.hostname,
        port: wsOptions.port,
      });
      listener.close();
    } catch (e) {
      if (e instanceof Deno.errors.AddrInUse) {
        throw new Error(
          `Unable to create address ${wsOptions.hostname}:${wsOptions.port} because a process is already listening on it.`,
        );
      }
      throw e;
    }

    // Run the subprocess
    const browserProcess = Deno.run({
      cmd: buildArgs,
      stderr: "piped",
      stdout: "piped",
    });

    // Get the main ws conn for the client
    let mainWsUrl = "";
    for await (const line of readLines(browserProcess.stderr)) { // Loop also needed before json endpoint is up
      const match = line.match(/^DevTools listening on (ws:\/\/.*)$/);
      if (!match) {
        continue;
      }
      mainWsUrl = line.split("on ")[1];
      break;
    }
    const p = deferred();
    const mainSocket = new WebSocket(mainWsUrl);
    mainSocket.onopen = () => p.resolve();
    await p;
    const mainProtocol = new ProtocolClass(
      mainSocket,
      wsOptions.hostname,
      wsOptions.port,
    );
    await mainProtocol.sendWebSocketMessage("Page.enable");
    await mainProtocol.sendWebSocketMessage("Runtime.enable");
    await mainProtocol.sendWebSocketMessage("Log.enable");
    await mainProtocol.sendWebSocketMessage("Target.enable");

    // Get the connection info for the default page thats opened, that acts as our first page
    const targets = await mainProtocol.sendWebSocketMessage<
      null,
      ProtocolTypes.Target.GetTargetsResponse
    >("Target.getTargets");
    const target = targets.targetInfos.find((info) =>
      info.type === "page" && info.url === "about:blank"
    ) as ProtocolTypes.Target.TargetInfo;
    const websocket = new WebSocket(
      `ws://${wsOptions.hostname}:${wsOptions.port}/devtools/page/${target
        ?.targetId}`,
    );
    const promise = deferred();
    websocket.onopen = () => promise.resolve();
    await promise;
    const protocol = new ProtocolClass(
      websocket,
      wsOptions.hostname,
      wsOptions.port,
    );
    const method = "Runtime.executionContextCreated";
    protocol.notification_resolvables.set(method, deferred());
    await protocol.sendWebSocketMessage("Page.enable");
    await protocol.sendWebSocketMessage("Runtime.enable");
    await protocol.sendWebSocketMessage("Log.enable");
    const notificationData =
      (await protocol.notification_resolvables.get(method)) as {
        context: {
          auxData: {
            frameId: string;
          };
        };
      };
    const { frameId } = notificationData.context.auxData;

    // Return a client and page instance for the user to interact with
    const client = new Client(
      mainProtocol,
      browserProcess,
      browser,
      firefoxProfilePath,
    );
    mainProtocol.client = client;
    protocol.client = client;
    const page = new Page(protocol, target.targetId, client, frameId);
    client.#pages.push(page);
    return {
      browser: client,
      page,
    };
  }
}
