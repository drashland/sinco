import { deferred } from "../deps.ts";
import { BuildOptions, WebsocketTarget } from "./interfaces.ts";
import { Page } from "./page.ts";
import { getChromeArgs } from "./utility.ts";

const defaultOptions = {
  hostname: "localhost",
  debuggerPort: 9292,
  binaryPath: undefined,
  remote: false,
};

/**
 * A way to interact with the headless browser instance.
 *
 * This is the entrypoint API to creating and interacting with the chrome or
 * browser. It allows:
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
   * Websocket conn for the overall browser process
   */
  readonly #socket: WebSocket;

  /**
   * The sub process that runs headless chrome
   */
  readonly #browser_process: Deno.ChildProcess | undefined;

  #closed = false;

  /**
   * The host and port that the websocket server is listening on
   */
  readonly wsOptions: {
    hostname: string;
    port: number;
  };

  /**
   * @param browserProcess - The browser process to interact with
   * @param wsOptions - The debugger options
   */
  constructor(
    socket: WebSocket,
    browserProcess: Deno.ChildProcess | undefined,
    wsOptions: {
      hostname: string;
      port: number;
    },
  ) {
    this.#socket = socket;
    this.#browser_process = browserProcess;
    this.wsOptions = wsOptions;
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
    if (this.#closed) {
      return;
    }

    // Close browser process (also closes the ws endpoint, which in turn closes all sockets)
    // Though if browser process isn't present (eg remote) then just close socket
    const p = deferred();
    this.#socket.onclose = () => p.resolve();
    if (this.#browser_process) {
      this.#browser_process.stderr.cancel();
      this.#browser_process.stdout.cancel();
      this.#browser_process.kill();
      await this.#browser_process.status;
    } else {
      this.#socket.close();
    }
    await p;
    this.#closed = true;

    if (errMsg) {
      throw new errClass(errMsg);
    }
  }

  /**
   * Creates the instance and protocol to interact with, and a Page
   * instance, representing a placeholder page we opened for you
   *
   * @param buildArgs - Sub process args, should be ones to run chrome
   * @param wsOptions - Hostname and port to run the websocket server on, and whether the browser is remote
   * @param browser - Which browser we are building
   *
   * @returns A client and browser instance, ready to be used
   */
  static async create(
    {
      hostname = "localhost",
      debuggerPort = 9292,
      binaryPath,
      remote,
    }: BuildOptions = defaultOptions,
  ): Promise<{
    browser: Client;
    page: Page;
  }> {
    let browserProcess: Deno.ChildProcess | undefined = undefined;

    if (!remote) {
      const buildArgs = getChromeArgs(debuggerPort, binaryPath);
      const path = buildArgs.splice(0, 1)[0];
      const command = new Deno.Command(path, {
        args: buildArgs,
        stderr: "piped",
        stdout: "piped",
      });
      browserProcess = command.spawn();
    }
    // Wait until endpoint is ready and get a WS connection
    // to the main socket
    const p = deferred<WebSocket>();
    const intervalId = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://${hostname}:${debuggerPort}/json/version`,
        );
        const json = await res.json() as WebsocketTarget;
        const socket = new WebSocket(json["webSocketDebuggerUrl"]);
        const p2 = deferred();
        socket.onopen = () => p2.resolve();
        await p2;
        p.resolve(socket);
        clearInterval(intervalId);
      } catch (_ex) {
        //do nothing
      }
    }, 200);

    const clientSocket = await p;

    const listRes = await fetch(
      `http://${hostname}:${debuggerPort}/json/list`,
    );
    const targetId = (await listRes.json())[0]["id"];

    const client = new Client(
      clientSocket,
      browserProcess,
      {
        hostname,
        port: debuggerPort,
      },
    );

    // Handle CTRL+C for example
    // TODO :: Even if we remove this in the timeout callback, we still get leaking ops
    // const onSIGINT = async () => {
    //   await client.close();
    //   Deno.exit(1);
    // }
    // Deno.addSignalListener("SIGINT", onSIGINT);
    // Handle a timeout from our protocol
    addEventListener("timeout", async (e) => {
      await client.close((e as CustomEvent<string>).detail);
    });

    const page = await Page.create(
      client,
      targetId,
    );

    return {
      browser: client,
      page,
    };
  }
}
