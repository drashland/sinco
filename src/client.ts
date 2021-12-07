import {
  assertEquals,
  Deferred,
  deferred,
  Protocol,
  readLines,
} from "../deps.ts";
import { existsSync, generateTimestamp } from "./utility.ts";
import { Element } from "./element.ts";
import { Page } from "./page.ts";

export interface BuildOptions {
  debuggerPort?: number; // The port to start the debugger on for Chrome, so that we can connect to it. Defaults to 9292
  hostname?: string; // The hostname the browser process starts on. If on host machine, this will be "localhost", if in docker, it will bee the container name. Defaults to localhost
  binaryPath?: string; //The Full Path to the browser binary. If using an alternative chromium based browser, this field is necessary.
}

interface MessageResponse { // For when we send an event to get one back, eg running a JS expression
  id: number;
  result?: Record<string, unknown>; // Present on success, OR for example if we  use goTo and the url doesnt exist (in firefox)
  error?: unknown; // Present on error
}

interface NotificationResponse { // Not entirely sure when, but when we send the `Network.enable` method
  method: string;
  params: unknown;
}

export class Client {
  /**
   * The sub process that runs headless chrome
   */
  private readonly browser_process: Deno.Process;

  /**
   * Our web socket connection to the remote debugging port
   */
  private readonly socket: WebSocket;

  /**
   * A counter that acts as the message id we use to send as part of the event data through the websocket
   */
  private next_message_id = 1;

  protected frame_id: string;

  /**
   * To keep hold of promises waiting for a notification from the websocket
   */
  protected notification_resolvables: Map<string, Deferred<void>> = new Map();

  /**
   * Track if we've closed the sub process, so we dont try close it when it already has been
   */
  private browser_process_closed = false;

  /**
   * To keep hold of our promises waiting for messages from the websocket
   */
  private resolvables: Map<number, Deferred<unknown>> = new Map();

  private browser: "firefox" | "chrome";

  /**
   * Only if the browser is firefox, is this present.
   * This is the path to the directory that firefox uses
   * to write a profile
   */
  private firefox_profile_path: string | undefined = undefined;

  constructor(
    socket: WebSocket,
    browserProcess: Deno.Process,
    browser: "firefox" | "chrome",
    frameId: string,
    firefoxProfilePath?: string,
  ) {
    this.browser = browser;
    this.socket = socket;
    this.browser_process = browserProcess;
    this.firefox_profile_path = firefoxProfilePath;
    this.frame_id = frameId;
    // Register on message listener
    this.socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === "Page.frameStartedLoading") {
        this.frame_id = data.params.frameId;
      }
      this.handleSocketMessage(data);
    };
  }

  /**
   * Asserts a given url matches the current
   *
   * @param expectedUrl - The expected url, eg `https://google.com/hello`
   */
  // todo :: no need for this when we use page as user can do assertEquals(..., await page.location)
  public async assertUrlIs(expectedUrl: string): Promise<void> {
    const actualUrl = await this.evaluatePage(`window.location.href`);
    if (actualUrl !== expectedUrl) { // Before we know the test will fail, close everything
      await this.done();
    }
    assertEquals(actualUrl, expectedUrl);
  }

  /**
   * Check if the given text exists on the dom
   *
   * @param text - The text to check for
   */
  public async assertSee(text: string): Promise<void> {
    const command = `document.body.innerText.indexOf('${text}') >= 0`;
    const exists = await this.evaluatePage(command);
    if (exists !== true) { // We know it's going to fail, so before an assertion error is thrown, cleanupup
      await this.done();
    }
    assertEquals(exists, true);
  }

  /**
   * Go to a specific page
   *
   * @param urlToVisit - The page to go to
   */
  public async goTo(urlToVisit: string): Promise<Page> {
    const method = "Page.loadEventFired";
    this.notification_resolvables.set(method, deferred());
    const notificationPromise = this.notification_resolvables.get(method);
    const res = await this.sendWebSocketMessage<
      Protocol.Page.NavigateRequest,
      Protocol.Page.NavigateResponse
    >(
      "Page.navigate",
      {
        url: urlToVisit,
      },
    );
    await notificationPromise;
    if (res.errorText) {
      await this.done(
        `${res.errorText}: Error for navigating to page "${urlToVisit}"`,
      );
    }
    return new Page(
      this.socket,
      this.browser_process,
      this.browser,
      this.frame_id,
      this.firefox_profile_path,
    );
  }

  public async querySelector(selector: string) {
    const result = await this.evaluatePage(
      `document.querySelector('${selector}')`,
    );
    if (result === null) {
      await this.done(
        'The selector "' + selector + '" does not exist inside the DOM',
      );
    }
    return new Element("document.querySelector", selector, this);
  }

  public $x(_selector: string) {
    throw new Error("Client#$x not impelemented");
    // todo check the element exists first
    //return new Element('$x', selector, this)
  }

  /**
   * Invoke a function or string expression on the current frame.
   *
   * @param pageCommand - The function to be called or the line of code to execute.
   *
   * @returns The result of the evaluation
   */
  public async evaluatePage(
    pageCommand: (() => unknown) | string,
    // As defined by the protocol, the `value` is `any`
    // deno-lint-ignore no-explicit-any
  ): Promise<any> {
    if (typeof pageCommand === "string") {
      const result = await this.sendWebSocketMessage<
        Protocol.Runtime.EvaluateRequest,
        Protocol.Runtime.EvaluateResponse
      >("Runtime.evaluate", {
        expression: pageCommand,
        includeCommandLineAPI: true, // sopprts things like $x
      });
      await this.checkForErrorResult(result, pageCommand);
      return result.result.value;
    }

    if (typeof pageCommand === "function") {
      const { executionContextId } = await this.sendWebSocketMessage<
        Protocol.Page.CreateIsolatedWorldRequest,
        Protocol.Page.CreateIsolatedWorldResponse
      >(
        "Page.createIsolatedWorld",
        {
          frameId: this.frame_id,
        },
      );

      const res = await this.sendWebSocketMessage<
        Protocol.Runtime.CallFunctionOnRequest,
        Protocol.Runtime.CallFunctionOnResponse
      >(
        "Runtime.callFunctionOn",
        {
          functionDeclaration: pageCommand.toString(),
          executionContextId: executionContextId,
          returnByValue: true,
          awaitPromise: true,
          userGesture: true,
        },
      );
      await this.checkForErrorResult(res, pageCommand.toString());
      return res.result.value;
    }
  }

  /**
   * Wait for the page to change. Can be used with `click()` if clicking a button or anchor tag that redirects the user
   */
  public async waitForPageChange(): Promise<void> {
    const method = "Page.loadEventFired";
    this.notification_resolvables.set(method, deferred());
    const notificationPromise = this.notification_resolvables.get(method);
    await notificationPromise;
    this.notification_resolvables.delete(method);
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
   * Set a cookie for the `url`. Will be passed across 'sessions' based
   * from the `url`
   *
   * @param name - Name of the cookie, eg X-CSRF-TOKEN
   * @param value - Value to assign to the cookie name, eg "some cryptic token"
   * @param url - The domain to assign the cookie to, eg "https://drash.land"
   *
   * @example
   * ```ts
   * await Sinco.setCookie("X-CSRF-TOKEN", "abc123", "https://drash.land")
   * const result = await Sinco.evaluatePage(`document.cookie`) // "X-CSRF-TOKEN=abc123"
   * ```
   */
  public async setCookie(
    name: string,
    value: string,
    url: string,
  ): Promise<void> {
    const res = await this.sendWebSocketMessage<
      Protocol.Network.SetCookieRequest,
      Protocol.Network.SetCookieResponse
    >("Network.setCookie", {
      name,
      value,
      url,
    });
    if ("success" in res === false && "message" in res) {
      //await this.done(res.message);
    }
  }

  /**
   * Take a screenshot of the page and save it to `filename` in `path` folder, with a `format` and `quality` (jpeg format only)
   * If `selector` is passed in, it will take a screenshot of only that element
   * and its children as opposed to the whole page.
   *
   * @param path - The path of where to save the screenshot to
   * @param options - options
   * @param options.filename - Name to be given to the screenshot. Optional
   * @param options.selector - Screenshot the given selector instead of the full page. Optional
   * @param options.format - The Screenshot format(and hence extension). Allowed values are "jpeg" and "png" - Optional
   * @param options.quality - The image quality from 0 to 100, default 80. Applicable only if no format provided or format is "jpeg" - Optional
   */
  public async takeScreenshot(
    path: string,
    options?: {
      selector?: string;
      fileName?: string;
      format?: "jpeg" | "png";
      quality?: number;
    },
  ): Promise<string> {
    if (!existsSync(path)) {
      await this.done();
      throw new Error(`The provided folder path - ${path} doesn't exist`);
    }
    const ext = options?.format ?? "jpeg";
    const clip = (options?.selector)
      ? await this.getViewport(options.selector)
      : undefined;

    if (options?.quality && Math.abs(options.quality) > 100 && ext == "jpeg") {
      await this.done("A quality value greater than 100 is not allowed.");
    }

    //Quality should defined only if format is jpeg
    const quality = (ext == "jpeg")
      ? ((options?.quality) ? Math.abs(options.quality) : 80)
      : undefined;

    const res = await this.sendWebSocketMessage<
      Protocol.Page.CaptureScreenshotRequest,
      Protocol.Page.CaptureScreenshotResponse
    >(
      "Page.captureScreenshot",
      {
        format: ext,
        quality: quality,
        clip: clip,
      },
    ) as {
      data: string;
    };

    //Writing the Obtained Base64 encoded string to image file
    const fName = `${path}/${
      options?.fileName?.replaceAll(/.jpeg|.jpg|.png/g, "") ??
        generateTimestamp()
    }.${ext}`;
    const B64str = res.data;
    const u8Arr = Uint8Array.from<string>(atob(B64str), (c) => c.charCodeAt(0));
    try {
      Deno.writeFileSync(fName, u8Arr);
    } catch (e) {
      await this.done();
      throw new Error(e.message);
    }

    return fName;
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

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * This method is used internally to calculate the element Viewport (Dimensions)
   * executes getBoundingClientRect of the obtained element
   * @param selector - The selector for the element to capture
   * @returns ViewPort object - Which contains the dimensions of the element captured
   */
  protected async getViewport(
    selector: string,
  ): Promise<Protocol.Page.Viewport> {
    const res = await this.evaluatePage(
      `JSON.stringify(document.querySelector('${selector}').getBoundingClientRect())`,
    );
    const values = JSON.parse(res);
    return {
      x: values.x,
      y: values.y,
      width: values.width,
      height: values.height,
      scale: 2,
    };
  }

  protected handleSocketMessage(
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

  /**
   * Main method to handle sending messages/events to the websocket endpoint.
   *
   * @param method - Any DOMAIN, see sidebar at https://chromedevtools.github.io/devtools-protocol/tot/, eg Runtime.evaluate, or DOM.getDocument
   * @param params - Parameters required for the domain method
   *
   * @returns
   */
  protected async sendWebSocketMessage<RequestType, ResponseType>(
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
   * Checks if the result is an error
   *
   * @param result - The DOM result response, after writing to stdin and getting by stdout of the process
   * @param commandSent - The command sent to trigger the result
   */
  protected async checkForErrorResult(
    result: Protocol.Runtime.AwaitPromiseResponse,
    commandSent: string,
  ): Promise<void> {
    const exceptionDetail = result.exceptionDetails;
    if (!exceptionDetail) {
      return;
    }
    if (exceptionDetail.text && !exceptionDetail.exception) { // specific for firefox
      await this.done(exceptionDetail.text);
    }
    const errorMessage = exceptionDetail.exception!.description ??
      exceptionDetail.text;
    if (errorMessage.includes("SyntaxError")) { // a syntax error
      const message = errorMessage.replace("SyntaxError: ", "");
      await this.done();
      throw new SyntaxError(message + ": `" + commandSent + "`");
    }
    // any others, unsure what they'd be
    await this.done(`${errorMessage}: "${commandSent}"`);
  }

  protected static async create(
    buildArgs: string[],
    wsOptions: {
      hostname: string;
      port: number;
    },
    browser: "firefox" | "chrome",
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
    const { debugUrl: wsUrl, frameId } = await Client.getWebSocketInfo(
      wsOptions.hostname,
      wsOptions.port,
    );
    const websocket = new WebSocket(wsUrl);
    const promise = deferred();
    websocket.onopen = () => promise.resolve();
    await promise;
    const TempClient = new Client(websocket, browserProcess, browser, frameId);
    await TempClient.sendWebSocketMessage("Page.enable");
    await TempClient.sendWebSocketMessage("Runtime.enable");
    return new Client(
      websocket,
      browserProcess,
      browser,
      frameId,
      firefoxProfilePath,
    );
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
  private static async getWebSocketInfo(
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
}
