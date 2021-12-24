import { assertEquals, AssertionError, deferred, Protocol } from "../deps.ts";
import { existsSync, generateTimestamp } from "./utility.ts";
import { Element } from "./element.ts";
import { Protocol as ProtocolClass } from "./protocol.ts";
import { Cookie, ScreenshotOptions } from "./interfaces.ts";
import { Client } from "./client.ts"

/**
 * A representation of the page the client is on, allowing the client to action
 * on it, such as setting cookies, or selecting elements, or interacting with localstorage etc
 */
export class Page {
  /**
   * The pages specific protocol to communicate on the page
   */
  readonly #protocol: ProtocolClass;

  target_id: string; // also the target id for the page

  #client: Client

  constructor(protocol: ProtocolClass, targetId: string, client: Client) {
    this.#protocol = protocol;
    this.target_id = targetId;
    this.#client = client
  }

  public get socket () {
    return this.#protocol.socket
  }

  public async _close() {
    const p = deferred();
    this.#protocol.socket.onclose = () => p.resolve();
    this.#protocol.socket.close();
    await p;
  }

  /**
   * Closes the page. After, you will not be able to interact with it
   */
  public async close() {
    // Delete page
    const method = "Inspector.detatched";
    const map = this.#protocol.notification_resolvables.set(method, deferred());
    const p = map.get(
      method,
    );
    this.#protocol.sendWebSocketMessage("Target.closeTarget", {
      targetId: this.target_id,
    });
    await p;

    // Close socket
    const p2 = deferred()
    this.#protocol.socket.onclose = () => p2.resolve()
    this.#protocol.socket.close()
    await p2
    
    // And remove it from the pages array
    for (const i in this.#client.pages) {
      if (this.#client.pages[i].target_id === this.target_id) {
        delete this.#client.pages[i];
        break;
      }
    }
  }

  /**
   * Either get all cookies for the page, or set a cookie
   *
   * @param newCookie - Only required if you want to set a cookie
   *
   * @returns All cookies for the page if no parameter is passed in, else an empty array
   */
  public async cookie(
    newCookie?: Cookie,
  ): Promise<Protocol.Network.Cookie[] | []> {
    if (!newCookie) {
      const result = await this.#protocol.sendWebSocketMessage<
        Protocol.Network.GetCookiesRequest,
        Protocol.Network.GetCookiesResponse
      >("Network.getCookies");
      return result.cookies;
    }
    await this.#protocol.sendWebSocketMessage<
      Protocol.Network.SetCookieRequest,
      Protocol.Network.SetCookieResponse
    >("Network.setCookie", {
      name: newCookie.name,
      value: newCookie.value,
      url: newCookie.url,
    });
    return [];
  }

  /**
   * Either get the href/url for the page, or set the location
   *
   * @param newLocation - Only required if you want to set the location
   *
   * @example
   * ```js
   * const location = await page.location() // "https://drash.land"
   * ```
   *
   * @returns The location for the page if no parameter is passed in, else an empty string
   */
  public async location(newLocation?: string): Promise<string> {
    if (!newLocation) {
      const targets = await this.#protocol.sendWebSocketMessage<
        null,
        Protocol.Target.GetTargetsResponse
      >("Target.getTargets");
      const target = targets.targetInfos.find((target) =>
        target.targetId === this.target_id
      );
      return target!.url;
    }
    const method = "Page.loadEventFired";
    this.#protocol.notification_resolvables.set(method, deferred());
    const notificationPromise = this.#protocol.notification_resolvables.get(
      method,
    );
    const res = await this.#protocol.sendWebSocketMessage<
      Protocol.Page.NavigateRequest,
      Protocol.Page.NavigateResponse
    >(
      "Page.navigate",
      {
        url: newLocation,
      },
    );
    await notificationPromise;
    if (res.errorText) {
      await this.#client.close(
        `${res.errorText}: Error for navigating to page "${newLocation}"`,
      );
    }
    return "";
  }

  /**
   * Invoke a function or string expression on the current frame.
   *
   * @param pageCommand - The function to be called or the line of code to execute.
   *
   * @returns The result of the evaluation
   */
  async evaluate(
    pageCommand: (() => unknown) | string,
    // As defined by the #protocol, the `value` is `any`
    // deno-lint-ignore no-explicit-any
  ): Promise<any> {
    if (typeof pageCommand === "string") {
      const result = await this.#protocol.sendWebSocketMessage<
        Protocol.Runtime.EvaluateRequest,
        Protocol.Runtime.EvaluateResponse
      >("Runtime.evaluate", {
        expression: pageCommand,
        includeCommandLineAPI: true, // supports things like $x
      });
      console.log(result);
      await this.#checkForErrorResult(result, pageCommand);
      return result.result.value;
    }

    if (typeof pageCommand === "function") {
      const { executionContextId } = await this.#protocol.sendWebSocketMessage<
        Protocol.Page.CreateIsolatedWorldRequest,
        Protocol.Page.CreateIsolatedWorldResponse
      >(
        "Page.createIsolatedWorld",
        {
          frameId: this.target_id,
        },
      );

      const res = await this.#protocol.sendWebSocketMessage<
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
      await this.#checkForErrorResult(res, pageCommand.toString());
      return res.result.value;
    }
  }

  expectPageChange() {
    this.#protocol.notification_resolvables.set('Page.windowOpen', deferred())
  }

  /**
   * Wait for the page to change. Can be used with `click()` if clicking a button or anchor tag that redirects the user
   */
  async waitForPageChange(): Promise<void> {
    const method = "Page.loadEventFired";
    const notificationPromise = this.#protocol.notification_resolvables.get(
      method,
    );
    await notificationPromise;
    this.#protocol.notification_resolvables.delete(method);
  }

  /**
   * Check if the given text exists on the DOM
   *
   * @param text - The text to check for
   */
  async assertSee(text: string): Promise<void> {
    const command = `document.body.innerText.includes('${text}')`;
    const exists = await this.evaluate(command);
    if (exists !== true) { // We know it's going to fail, so before an assertion error is thrown, cleanupup
      await this.#client.close();
    }
    assertEquals(exists, true);
  }

  /**
   * Representation of the Browser's `document.querySelector`
   *
   * @param selector - The selector for the element
   *
   * @returns An element class, allowing you to take an action upon that element
   */
  async querySelector(selector: string) {
    console.log(`document.querySelector('${selector}')`)
    const result = await this.#protocol.sendWebSocketMessage<
      Protocol.Runtime.EvaluateRequest,
      Protocol.Runtime.EvaluateResponse
    >("Runtime.evaluate", {
      expression: `document.querySelector('${selector}')`,
      includeCommandLineAPI: true,
    });
    if (result.result.value === null) {
      await this.#client.close(
        'The selector "' + selector + '" does not exist inside the DOM',
      );
    }
    console.log("da queryse result", result);
    return new Element(
      "document.querySelector",
      selector,
      this,
      this.#protocol,
      result.result.objectId,
    );
  }

  /**
   * Only needed if you want this page to be displayed.
   * Without calling this method, you can still communicate to each page.
   */
  public async focus() {
    await this.#protocol.sendWebSocketMessage("Page.bringToFront");
  }

  /**
   * Assert that there are no errors in the developer console, such as:
   *   - 404's (favicon for example)
   *   - Issues with JavaScript files
   *   - etc
   *
   * @param exceptions - A list of strings that if matched, will be ignored such as ["favicon.ico"] if you want/need to ignore a 404 error for this file
   *
   * @throws AssertionError
   */
  public async assertNoConsoleErrors(exceptions: string[] = []) {
    const forMessages = deferred();
    let notifCount = 0;
    // deno-lint-ignore no-this-alias
    const self = this;
    const interval = setInterval(function () {
      const notifs = self.#protocol.console_errors;
      // If stored notifs is greater than what we've got, then
      // more notifs are being sent to us, so wait again
      if (notifs.length > notifCount) {
        notifCount = notifs.length;
        return;
      }
      // Otherwise, we have not gotten anymore notifs in the last .5s
      clearInterval(interval);
      forMessages.resolve();
    }, 1000);
    await forMessages;
    const errorNotifs = this.#protocol.console_errors;
    const filteredNotifs = !exceptions.length
      ? errorNotifs
      : errorNotifs.filter((notif) => {
        const notifCanBeIgnored = exceptions.find((exception) => {
          if (notif.includes(exception)) {
            return true;
          }
          return false;
        });
        if (notifCanBeIgnored) {
          return false;
        }
        return true;
      });
    if (!filteredNotifs.length) {
      return;
    }
    await this.#client.close();
    throw new AssertionError(
      "Expected console to show no errors. Instead got:\n" +
        filteredNotifs.join("\n"),
    );
  }

  /**
   * Take a screenshot of the page and save it to `filename` in `path` folder, with a `format` and `quality` (jpeg format only)
   * If `selector` is passed in, it will take a screenshot of only that element
   * and its children as opposed to the whole page.
   *
   * @param path - The path of where to save the screenshot to
   * @param options
   *
   * @returns The path to the file relative to CWD, e.g., "Screenshots/users/user_1.png"
   */
  async takeScreenshot(
    path: string,
    options?: ScreenshotOptions,
  ): Promise<string> {
    if (!existsSync(path)) {
      await this.#client.close();
      throw new Error(`The provided folder path - ${path} doesn't exist`);
    }
    const ext = options?.format ?? "jpeg";
    const rawViewportResult = options?.selector
      ? await this.evaluate(
        `JSON.stringify(document.querySelector('${options.selector}').getBoundingClientRect())`,
      )
      : "{}";
    const jsonViewportResult = JSON.parse(rawViewportResult);
    const viewPort = {
      x: jsonViewportResult.x,
      y: jsonViewportResult.y,
      width: jsonViewportResult.width,
      height: jsonViewportResult.height,
      scale: 2,
    };
    const clip = (options?.selector) ? viewPort : undefined;

    if (options?.quality && Math.abs(options.quality) > 100 && ext == "jpeg") {
      await this.#client.close(
        "A quality value greater than 100 is not allowed.",
      );
    }

    //Quality should defined only if format is jpeg
    const quality = (ext == "jpeg")
      ? ((options?.quality) ? Math.abs(options.quality) : 80)
      : undefined;

    const res = await this.#protocol.sendWebSocketMessage<
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
      await this.#client.close();
      throw new Error(e.message);
    }

    return fName;
  }

  /**
   * Checks if the result is an error
   *
   * @param result - The DOM result response, after writing to stdin and getting by stdout of the process
   * @param commandSent - The command sent to trigger the result
   */
  async #checkForErrorResult(
    result: Protocol.Runtime.AwaitPromiseResponse,
    commandSent: string,
  ): Promise<void> {
    const exceptionDetail = result.exceptionDetails;
    if (!exceptionDetail) {
      return;
    }
    if (exceptionDetail.text && !exceptionDetail.exception) { // specific for firefox
      await this.#client.close(exceptionDetail.text);
    }
    const errorMessage = exceptionDetail.exception!.description ??
      exceptionDetail.text;
    if (errorMessage.includes("SyntaxError")) { // a syntax error
      const message = errorMessage.replace("SyntaxError: ", "");
      await this.#client.close();
      throw new SyntaxError(message + ": `" + commandSent + "`");
    }
    // any others, unsure what they'd be
    await this.#client.close(`${errorMessage}: "${commandSent}"`);
  }

  public async test() {
    console.log(
      await this.#protocol.sendWebSocketMessage("Target.getTargets", {
        url: "https://google.com",
      }),
    );
  }
}
