import { AssertionError, deferred, Protocol } from "../deps.ts";
import { existsSync, generateTimestamp } from "./utility.ts";
import { Element } from "./element.ts";
import { Protocol as ProtocolClass } from "./protocol.ts";
import { Cookie, ScreenshotOptions } from "./interfaces.ts";
import { Client } from "./client.ts";
import type { Deferred } from "../deps.ts";

/**
 * A representation of the page the client is on, allowing the client to action
 * on it, such as setting cookies, or selecting elements, or interacting with localstorage etc
 */
export class Page {
  /**
   * The pages specific protocol to communicate on the page
   */
  readonly #protocol: ProtocolClass;

  /**
   * If chrome, will look like 4174549611B216287286CA10AA78BF56
   * If firefox, will look like 41745-49611-B2162-87286 (eg like a uuid)
   */
  readonly target_id: string;

  /**
   * If chrome, ends up being what target id is
   * If firefox, will be something like "26"
   */
  readonly #frame_id: string;

  readonly client: Client;

  constructor(
    protocol: ProtocolClass,
    targetId: string,
    client: Client,
    frameId: string,
  ) {
    this.#protocol = protocol;
    this.target_id = targetId;
    this.client = client;
    this.#frame_id = frameId;
  }

  public get socket() {
    return this.#protocol.socket;
  }

  /**
   * Tells Sinco you are expecting a dialog, so Sinco can listen for the event,
   * and when `.dialog()` is called, Sinco can accept or decline it at the right time
   *
   * @example
   * ```js
   * // Note that if `.click()` produces a dialog, do not await it.
   * await page.expectDialog();
   * await elem.click();
   * await page.dialog(true, "my username is Sinco");
   * ```
   */
  public expectDialog() {
    this.#protocol.notifications.set(
      "Page.javascriptDialogOpening",
      deferred(),
    );
  }

  /**
   * Interact with a dialog.
   *
   * Will throw if `.expectDialog()` was not called before.
   * This is so Sino doesn't try to accept/decline a dialog before
   * it opens.
   *
   * @example
   * ```js
   * // Note that if `.click()` produces a dialog, do not await it.
   * await page.expectDialog();
   * elem.click();
   * await page.dialog(true, "my username is Sinco");
   * ```
   *
   * @param accept - Whether to accept or dismiss the dialog
   * @param promptText  - The text to enter into the dialog prompt before accepting. Used only if this is a prompt dialog.
   */
  public async dialog(accept: boolean, promptText?: string) {
    const p = this.#protocol.notifications.get("Page.javascriptDialogOpening");
    if (!p) {
      throw new Error(
        `Trying to accept or decline a dialog without you expecting one. ".expectDialog()" was not called beforehand.`,
      );
    }
    await p;
    const method = "Page.javascriptDialogClosed";
    this.#protocol.notifications.set(method, deferred());
    const body: Protocol.Page.HandleJavaScriptDialogRequest = {
      accept,
    };
    if (promptText) {
      body.promptText = promptText;
    }
    await this.#protocol.send<
      Protocol.Page.HandleJavaScriptDialogRequest,
      null
    >("Page.handleJavaScriptDialog", body);
    const closedPromise = this.#protocol.notifications.get(method);
    await closedPromise;
  }

  /**
   * Closes the page. After, you will not be able to interact with it
   */
  public async close() {
    // Delete page
    this.#protocol.send<
      Protocol.Target.CloseTargetRequest,
      Protocol.Target.CloseTargetResponse
    >("Target.closeTarget", {
      targetId: this.target_id,
    });

    // wait for socket to close (closing page also shuts down connection to debugger url)
    const p2 = deferred();
    this.#protocol.socket.onclose = () => p2.resolve();
    await p2;

    // And remove it from the pages array
    this.client._popPage(this.target_id);
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
      const result = await this.#protocol.send<
        Protocol.Network.GetCookiesRequest,
        Protocol.Network.GetCookiesResponse
      >("Network.getCookies");
      return result.cookies;
    }
    await this.#protocol.send<
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
   * Tell Sinco that you will be expecting to wait for a request
   */
  public expectWaitForRequest() {
    const requestWillBeSendMethod = "Network.requestWillBeSent";
    this.#protocol.notifications.set(requestWillBeSendMethod, deferred());
  }

  /**
   * Wait for a request to finish loading.
   *
   * Can be used to wait for:
   *   - Clicking a button that (via JS) will send a HTTO request via axios/fetch etc
   *   - Submitting an inline form
   *   - ... and many others
   */
  public async waitForRequest() {
    const params = await this.#protocol.notifications.get(
      "Network.requestWillBeSent",
    ) as {
      requestId: string;
    };
    if (!params) {
      throw new Error(
        `Unable to wait for a request because \`.expectWaitForRequest()\` was not called.`,
      );
    }
    const { requestId } = params;
    const method = "Network.loadingFinished";
    this.#protocol.notifications.set(method, {
      params: {
        requestId,
      },
      promise: deferred(),
    });
    const result = this.#protocol.notifications.get(method) as unknown as {
      promise: Deferred<never>;
    };
    await result.promise;
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
      const targets = await this.#protocol.send<
        null,
        Protocol.Target.GetTargetsResponse
      >("Target.getTargets");
      const target = targets.targetInfos.find((target) =>
        target.targetId === this.target_id
      );
      return target?.url ?? "";
    }
    const method = "Page.loadEventFired";
    this.#protocol.notifications.set(method, deferred());
    const notificationPromise = this.#protocol.notifications.get(
      method,
    );
    const res = await this.#protocol.send<
      Protocol.Page.NavigateRequest,
      Protocol.Page.NavigateResponse
    >(
      "Page.navigate",
      {
        url: newLocation,
      },
    );

    // Usually if an invalid URL is given, the WS never gets a notification
    // but we get a message with the id associated with the msg we sent
    // TODO :: Ideally the protocol class would throw and we could catch it so we know
    // for sure its an error
    if ("errorText" in res) {
      if (notificationPromise && "resolve" in notificationPromise) {
        notificationPromise.resolve();
      }
      await this.client.close(res.errorText);
      return "";
    }

    await notificationPromise;
    if (res.errorText) {
      await this.client.close(
        `${res.errorText}: Error for navigating to page "${newLocation}"`,
      );
    }
    return "";
  }

  // deno-lint-ignore no-explicit-any
  public async evaluate(command: string): Promise<any>;
  public async evaluate(
    // deno-lint-ignore no-explicit-any
    pageFunction: (...args: any[]) => any | Promise<any>,
    ...args: unknown[]
    // deno-lint-ignore no-explicit-any
  ): Promise<any>;
  /**
   * Invoke a function or string expression on the current frame.
   *
   * @param pageCommand - The function to be called or the line of code to execute.
   * @param args - Only if pageCommand is a function. Arguments to pass to the command so you can use data that was out of scope
   *
   * @example
   * ```js
   * const user = { name: "Sinco" };
   * const result1 = await page.evaluate((user: { name: string }) => {
   *   // Now we're able to use `user` and any other bits of data!
   *   return user.name;
   * }, user) // "Sinco"
   * const result2 = await page.evaluate((user: { name: string }, window: Window, answer: "yes") => {
   *   // Query dom
   *   // ...
   *
   *   return {
   *     ...user,
   *     window,
   *     answer
   *   };
   * }, user, window, "yes") // { name: "Sinco", window: ..., answer: "yes" }
   * ```
   *
   * @returns The result of the evaluation
   */
  async evaluate(
    // deno-lint-ignore no-explicit-any
    pageCommand: ((...args: any[]) => unknown) | string,
    ...args: unknown[]
    // As defined by the #protocol, the `value` is `any`
    // deno-lint-ignore no-explicit-any
  ): Promise<any> {
    function convertArgument(
      this: Page,
      arg: unknown,
    ): Protocol.Runtime.CallArgument {
      if (typeof arg === "bigint") {
        return { unserializableValue: `${arg.toString()}n` };
      }
      if (Object.is(arg, -0)) return { unserializableValue: "-0" };
      if (Object.is(arg, Infinity)) return { unserializableValue: "Infinity" };
      if (Object.is(arg, -Infinity)) {
        return { unserializableValue: "-Infinity" };
      }
      if (Object.is(arg, NaN)) return { unserializableValue: "NaN" };
      return { value: arg };
    }

    if (typeof pageCommand === "string") {
      const result = await this.#protocol.send<
        Protocol.Runtime.EvaluateRequest,
        Protocol.Runtime.EvaluateResponse
      >("Runtime.evaluate", {
        expression: pageCommand,
        returnByValue: true,
        includeCommandLineAPI: true, // supports things like $x
      });
      await this.#checkForEvaluateErrorResult(result, pageCommand);
      return result.result.value;
    }

    if (typeof pageCommand === "function") {
      const { executionContextId } = await this.#protocol.send<
        Protocol.Page.CreateIsolatedWorldRequest,
        Protocol.Page.CreateIsolatedWorldResponse
      >(
        "Page.createIsolatedWorld",
        {
          frameId: this.#frame_id,
        },
      );

      const res = await this.#protocol.send<
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
          arguments: args.map(convertArgument.bind(this)),
        },
      );
      await this.#checkForEvaluateErrorResult(res, pageCommand.toString());
      return res.result.value;
    }
  }

  /**
   * Representation of the Browser's `document.querySelector`
   *
   * @param selector - The selector for the element
   *
   * @returns An element class, allowing you to take an action upon that element
   */
  async querySelector(selector: string) {
    const result = await this.#protocol.send<
      Protocol.Runtime.EvaluateRequest,
      Protocol.Runtime.EvaluateResponse
    >("Runtime.evaluate", {
      expression: `document.querySelector('${selector}')`,
      includeCommandLineAPI: true,
    });
    if (result.result.value === null) {
      await this.client.close(
        'The selector "' + selector + '" does not exist inside the DOM',
      );
    }
    return new Element(
      "document.querySelector",
      selector,
      this,
      this.#protocol,
      result.result.objectId,
    );
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
    await this.client.close(
      "Expected console to show no errors. Instead got:\n" +
        filteredNotifs.join("\n"),
      AssertionError,
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
      await this.client.close(
        `The provided folder path "${path}" doesn't exist`,
      );
    }
    const ext = options?.format ?? "jpeg";
    const clip = undefined;

    if (options?.quality && Math.abs(options.quality) > 100 && ext == "jpeg") {
      await this.client.close(
        "A quality value greater than 100 is not allowed.",
      );
    }

    //Quality should defined only if format is jpeg
    const quality = (ext == "jpeg")
      ? ((options?.quality) ? Math.abs(options.quality) : 80)
      : undefined;

    const res = await this.#protocol.send<
      Protocol.Page.CaptureScreenshotRequest,
      Protocol.Page.CaptureScreenshotResponse
    >(
      "Page.captureScreenshot",
      {
        format: ext,
        quality: quality,
        clip: clip,
      },
    );

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
      await this.client.close(e.message);
    }

    return fName;
  }

  /**
   * Checks if the result is an error
   *
   * @param result - The DOM result response, after writing to stdin and getting by stdout of the process
   * @param commandSent - The command sent to trigger the result
   */
  async #checkForEvaluateErrorResult(
    result: Protocol.Runtime.AwaitPromiseResponse,
    commandSent: string,
  ): Promise<void> {
    const exceptionDetail = result.exceptionDetails;
    if (!exceptionDetail) {
      return;
    }
    if (exceptionDetail.text && !exceptionDetail.exception) { // specific for firefox
      await this.client.close(exceptionDetail.text);
    }
    const errorMessage = exceptionDetail.exception!.description ??
      exceptionDetail.text;
    if (errorMessage.includes("SyntaxError")) { // a syntax error
      const message = errorMessage.replace("SyntaxError: ", "");
      await this.client.close(message + ": `" + commandSent + "`", SyntaxError);
    }
    // any others, unsure what they'd be
    await this.client.close(`${errorMessage}: "${commandSent}"`);
  }
}
