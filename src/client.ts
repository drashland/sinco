import { Protocol as ProtocolClass } from "./protocol.ts";
import { deferred, Protocol as ProtocolTypes } from "../deps.ts";
import { Page } from "./page.ts";
import type { Browsers } from "./types.ts";
import { existsSync } from "./utility.ts";
import { TextLineStream } from "jsr:@std/streams";

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
   * Whilst we won't be using this like a page would, it is used
   * as a 'general' protocol, not specific to pages, but maybe
   * to get targets, or general information of the overal browser
   */
  readonly #protocol: ProtocolClass;

  /**
   * The sub process that runs headless chrome
   */
  readonly #browser_process: Deno.ChildProcess | undefined;

  /**
   * Track if we've closed the sub process, so we dont try close it when it already has been
   */
  #browser_process_closed = false;

  /**
   * What browser are we running?
   */
  readonly browser: Browsers;

  /**
   * The collection of page objects for a user to interact with
   */
  #pages: Page[] = [];

  /**
   * Only if the browser is firefox, is this present.
   * This is the path to the directory that firefox uses
   * to write a profile
   */
  readonly #firefox_profile_path?: string;

  /**
   * The host and port that the websocket server is listening on
   */
  readonly wsOptions: {
    hostname: string;
    port: number;
  };

  /**
   * @param protocol - The browser protocol to interact with
   * @param browserProcess - The browser process to interact with
   * @param browser - The name of the browser we will be running
   * @param wsOptions - The debugger options
   * @param firefoxProfilePath - The path to the firefox dev profile (if applicable)
   */
  constructor(
    protocol: ProtocolClass,
    browserProcess: Deno.ChildProcess | undefined,
    browser: Browsers,
    wsOptions: {
      hostname: string;
      port: number;
    },
    firefoxProfilePath?: string,
  ) {
    this.#protocol = protocol;
    this.#browser_process = browserProcess;
    this.browser = browser;
    this.wsOptions = wsOptions;
    this.#firefox_profile_path = firefoxProfilePath;
  }

  /**
   * Only for internal use. No documentation or help
   * will be provided to users regarding this method
   *
   * This was only created so we could make `pages` property private,
   * but still allow the Page class to remove a page from the list
   *
   * @param pageTargetId - Target id of the page to remove
   */
  public _popPage(pageTargetId: string) {
    this.#pages = this.#pages.filter((page) => page.target_id !== pageTargetId);
  }

  /**
   * For internal use.
   *
   * Pushed a new item to the pages array
   *
   * @param page - Page to push
   */
  public _pushPage(
    page: Page,
  ): void {
    this.#pages.push(page);
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
   * @param pageNumber - Which page to get, the first/initial page? 1. The second you just opened via a click? 2.
   * @returns The page
   */
  public async page(pageNumber: number): Promise<Page> {
    // `i` is given to us in a way that makes the user understand exactly what page they want.
    // If 1, they want the first page, so we will get the 0th index
    const index = pageNumber - 1;

    if (!this.#pages[index]) {
      await this.close(
        "You have request to get page number " + pageNumber + ", but only " +
          this.#pages.length +
          " pages are opened. If the issue persists, please submit an issue.",
        RangeError,
      );
    }

    return this.#pages[index];
  }

  /**
   * Close/stop the sub process, and close the ws connection. Must be called when finished with all your testing
   *
   * @param errMsg - If provided, after closing, will throw an error with the message. Useful for throwing errors but making sure all resources are closed beforehand
   * @param errClass - The class name to throw with the error message, eg `SyntaxError`. Defaults to `Error`
   */
  public async close(
    errMsg?: string,
    errClass: { new (message: string): Error } = Error,
  ) {
    // Say a user calls an assertion method, and then calls close(), we make sure that if
    // the subprocess is already closed, dont try close it again
    if (this.#browser_process_closed === true) {
      return;
    }

    // Close browser process (also closes the ws endpoint, which in turn closes all sockets)
    if (this.#browser_process) {
      this.#browser_process.stderr!.cancel();
      this.#browser_process.stdout!.cancel();
      this.#browser_process.kill();
      await this.#browser_process.status;
    } else {
      // When Working with Remote Browsers, where we don't control the Browser Process explicitly
      const promise = deferred();
      this.#protocol.socket.onclose = () => promise.resolve();
      await this.#protocol.send("Browser.close");
      await promise;
    }

    // Zombie processes is a thing with Windows, the firefox process on windows
    // will not actually be closed using the above.
    // Related Deno issue: https://github.com/denoland/deno/issues/7087
    /* if (
      this.#browser_process && this.browser === "firefox" &&
      Deno.build.os === "windows"
    ) {
      const p = Deno.run({
        cmd: ["taskkill", "/F", "/IM", "firefox.exe"],
        stdout: "null",
        stderr: "null",
      });
      await p.status();
      p.close();
    } */

    this.#browser_process_closed = true;

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
      throw new errClass(errMsg);
    }
  }

  /**
   * Will close every tab/page that isn't the one passed in.
   * Useful if for some reason, a site has opened multiple tabs that you will not use
   *
   * @param page - The page to not close
   */
  public async closeAllPagesExcept(page: Page) {
    const pages = this.#pages.filter((p) => p.target_id !== page.target_id);
    for (const page of pages) {
      await page.close();
    }
  }

  /**
   * Creates the instance and protocol to interact with, and a Page
   * instance, representing a placeholder page we opened for you
   *
   * @param buildArgs - Sub process args, should be ones to run chrome
   * @param wsOptions - Hostname and port to run the websocket server on, and whether the browser is remote
   * @param browser - Which browser we are building
   * @param firefoxProfilePath - If firefox, the path to the temporary profile location
   *
   * @returns A client and browser instance, ready to be used
   */
  static async create(
    buildArgs: string[],
    wsOptions: {
      hostname: string;
      port: number;
      remote: boolean;
    },
    browser: Browsers,
    firefoxProfilePath?: string,
  ): Promise<{
    browser: Client;
    page: Page;
  }> {
    let browserProcess: Deno.ChildProcess | undefined = undefined;
    let browserWsUrl = "";
    // Run the subprocess, this starts up the debugger server
    if (!wsOptions.remote) { //Skip this if browser is remote
      const path = buildArgs.splice(0, 1)[0];
      const command = new Deno.Command(path, {
        args: buildArgs,
        stderr: "piped",
        stdout: "piped",
      });
      browserProcess = command.spawn();

      // Get the main ws conn for the client - this loop is needed as the ws server isn't open until we get the listeneing on.
      // We could just loop on the fetch of the /json/list endpoint, but we could tank the computers resources if the endpoint
      // isn't up for another 10s, meaning however many fetch requests in 10s
      // Sometimes it takes a while for the "Devtools listening on ws://..." line to show on windows + firefox too
      for await (
        const line of browserProcess.stderr.pipeThrough(new TextDecoderStream())
          .pipeThrough(new TextLineStream())
      ) { // Loop also needed before json endpoint is up
        const match = line.match(/^DevTools listening on (ws:\/\/.*)$/);
        if (!match) {
          continue;
        }
        browserWsUrl = line.split("on ")[1];
        break;
      }
    } else { //We just fetch the browser ws url on the json endpoint
      //This code waits for the remote browser for 5 seconds
      const waitTill = new Date().getTime() + 5000;
      let jsonObj = undefined;
      do {
        try {
          jsonObj = await (await fetch(
            `http://${wsOptions.hostname}:${wsOptions.port}/json/version`,
          )).json();
          break;
        } catch (_ex) {
          //do nothing
        }
      } while (new Date().getTime() < waitTill);

      browserWsUrl = jsonObj["webSocketDebuggerUrl"];
    }

    // Create the browser protocol
    const mainProtocol = await ProtocolClass.create(browserWsUrl);

    // Get the connection info for the default page thats opened, that acts as our first page
    // Sometimes, it isn't immediently available (eg `targets` is `[]`), so poll until it refreshes with the page

    async function getInitialPage(): Promise<ProtocolTypes.Target.TargetInfo> {
      const targets = await mainProtocol.send<
        null,
        ProtocolTypes.Target.GetTargetsResponse
      >("Target.getTargets");
      const target = targets.targetInfos.find((info) =>
        info.type === "page" && (info.url === "about:blank" || wsOptions.remote)
      );

      if (!target) {
        return await getInitialPage();
      }
      return target;
    }
    const pageTarget = await getInitialPage();

    await mainProtocol.send("Target.attachToTarget", {
      targetId: pageTarget.targetId,
    });

    // Create protocol for the default page
    const { protocol: pageProtocol, frameId } = await ProtocolClass.create(
      `ws://${wsOptions.hostname}:${wsOptions.port}/devtools/page/${pageTarget.targetId}`,
      true,
    );

    // Return a client and page instance for the user to interact with
    const client = new Client(
      mainProtocol,
      browserProcess,
      browser,
      {
        hostname: wsOptions.hostname,
        port: wsOptions.port,
      },
      firefoxProfilePath,
    );
    const page = new Page(pageProtocol, pageTarget.targetId, client, frameId);
    client.#pages.push(page);
    return {
      browser: client,
      page,
    };
  }
}
