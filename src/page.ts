import { deferred, Protocol as ProtocolTypes } from "../deps.ts";
import { Element } from "./element.ts";
import { Protocol as ProtocolClass } from "./protocol.ts";
import { Cookie, ScreenshotOptions } from "./interfaces.ts";
import { Client } from "./client.ts";
import { waitUntilNetworkIdle } from "./utility.ts";

/**
 * A representation of the page the client is on, allowing the client to action
 * on it, such as setting cookies, or selecting elements, or interacting with localstorage etc
 */
export class Page extends ProtocolClass {
  /**
   * If chrome, will look like 4174549611B216287286CA10AA78BF56
   * If firefox, will look like 41745-49611-B2162-87286 (eg like a uuid)
   *
   * When frame ID, if chrome, ends up being what target id is
   * If firefox, will be something like "26"
   */
  readonly target_id: string;

  readonly client: Client;

  #console_errors: string[] = [];

  #uuid: string;

  constructor(
    targetId: string,
    client: Client,
    socket: WebSocket,
  ) {
    super(socket);
    this.target_id = targetId;
    this.client = client;
    this.#uuid = (Math.random() + 1).toString(36).substring(7);

    this.#listenForErrors();
  }

  /**
   * Responsible for listening to errors so we can collect them
   */
  #listenForErrors() {
    const onError = (event: Event) => {
      if (event.type === "Runtime.exceptionThrown") {
        const evt = event as CustomEvent<
          ProtocolTypes.Runtime.ExceptionThrownEvent
        >;
        const msg = evt.detail.exceptionDetails.exception?.description ||
          evt.detail.exceptionDetails.text;
        this.#console_errors.push(msg);
      }
      if (event.type === "Log.entryAdded") {
        const evt = event as CustomEvent<ProtocolTypes.Log.EntryAddedEvent>;
        const { level, text } = evt.detail.entry;
        if (level === "error") {
          this.#console_errors.push(text);
        }
      }
    };

    addEventListener("Log.entryAdded", onError);
    addEventListener("Runtime.exceptionThrown", onError);
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
    this.notifications.set(
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
    const p = this.notifications.get("Page.javascriptDialogOpening");
    if (!p) {
      throw new Error(
        `Trying to accept or decline a dialog without you expecting one. ".expectDialog()" was not called beforehand.`,
      );
    }
    await p;
    const method = "Page.javascriptDialogClosed";
    this.notifications.set(method, deferred());
    const body: ProtocolTypes.Page.HandleJavaScriptDialogRequest = {
      accept,
    };
    if (promptText) {
      body.promptText = promptText;
    }
    await this.send<
      ProtocolTypes.Page.HandleJavaScriptDialogRequest,
      null
    >("Page.handleJavaScriptDialog", body);
    const closedPromise = this.notifications.get(method);
    await closedPromise;
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
  ): Promise<ProtocolTypes.Network.Cookie[] | []> {
    if (!newCookie) {
      const result = await this.send<
        ProtocolTypes.Network.GetCookiesRequest,
        ProtocolTypes.Network.GetCookiesResponse
      >("Network.getCookies");
      return result.cookies;
    }
    await this.send<
      ProtocolTypes.Network.SetCookieRequest,
      ProtocolTypes.Network.SetCookieResponse
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
   * @example
   * ```js
   * const location = await page.location("https://google.com"); // Or "http://localhost:9292"
   * ```
   */
  public async location(newLocation: string): Promise<void> {
    const res = await this.send<
      ProtocolTypes.Page.NavigateRequest,
      ProtocolTypes.Page.NavigateResponse
    >(
      "Page.navigate",
      {
        url: newLocation,
      },
    );

    await waitUntilNetworkIdle();

    // Usually if an invalid URL is given, the WS never gets a notification
    // but we get a message with the id associated with the msg we sent
    if ("errorText" in res) {
      await this.client.close(res.errorText);
      return;
    }
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
    ): ProtocolTypes.Runtime.CallArgument {
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
      const result = await this.send<
        ProtocolTypes.Runtime.EvaluateRequest,
        ProtocolTypes.Runtime.EvaluateResponse
      >("Runtime.evaluate", {
        expression: pageCommand,
        returnByValue: true,
        includeCommandLineAPI: true, // supports things like $x
      });
      await this.#checkForEvaluateErrorResult(result, pageCommand);
      return result.result.value;
    }

    if (typeof pageCommand === "function") {
      const { executionContextId } = await this.send<
        ProtocolTypes.Page.CreateIsolatedWorldRequest,
        ProtocolTypes.Page.CreateIsolatedWorldResponse
      >(
        "Page.createIsolatedWorld",
        {
          frameId: this.target_id,
        },
      );

      const res = await this.send<
        ProtocolTypes.Runtime.CallFunctionOnRequest,
        ProtocolTypes.Runtime.CallFunctionOnResponse
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
    const result = await this.send<
      ProtocolTypes.Runtime.EvaluateRequest,
      ProtocolTypes.Runtime.EvaluateResponse
    >("Runtime.evaluate", {
      expression: `document.querySelector('${selector}')`,
      includeCommandLineAPI: true,
    });
    if (result.result.value === null) {
      await this.client.close(
        'The selector "' + selector + '" does not exist inside the DOM',
      );
    }

    if (!result.result.objectId) {
      await this.client.close("Unable to find the object");
    }

    const { node } = await this.send<
      ProtocolTypes.DOM.DescribeNodeRequest,
      ProtocolTypes.DOM.DescribeNodeResponse
    >("DOM.describeNode", {
      objectId: result.result.objectId,
    });

    return new Element(
      selector,
      this,
      node,
      result.result.objectId as string,
    );
  }

  /**
   * Return the current list of console errors present in the dev tools
   */
  public async consoleErrors(): Promise<string[]> {
    // Give it some extra time in case to pick up some more
    const p = deferred();
    setTimeout(() => {
      p.resolve();
    }, 500);
    await p;
    return this.#console_errors;
  }

  /**
   * Take a screenshot of the page and save it to `filename` in `path` folder, with a `format` and `quality` (jpeg format only)
   * If `selector` is passed in, it will take a screenshot of only that element
   * and its children as opposed to the whole page.
   *
   * @param options
   *
   * @example
   * ```ts
   * try {
   *  Deno.writeFileSync('./tets.png', await page.screenshot());
   * } catch (e) {
   *   await browser.close(e.message);
   * }
   * ```
   *
   * @returns The path to the file relative to CWD, e.g., "Screenshots/users/user_1.png"
   */
  public async screenshot(
    options?: ScreenshotOptions,
  ): Promise<Uint8Array> {
    const ext = options?.format ?? "jpeg";
    const clip = undefined;

    if (options?.quality && Math.abs(options.quality) > 100 && ext == "jpeg") {
      await this.client.close(
        "A quality value greater than 100 is not allowed.",
      );
    }

    // Quality should defined only if format is jpeg
    const quality = (ext === "jpeg")
      ? ((options?.quality) ? Math.abs(options.quality) : 80)
      : undefined;

    const res = await this.send<
      ProtocolTypes.Page.CaptureScreenshotRequest,
      ProtocolTypes.Page.CaptureScreenshotResponse
    >(
      "Page.captureScreenshot",
      {
        format: ext,
        quality: quality,
        clip: clip,
      },
    );

    const B64str = res.data;
    return Uint8Array.from<string>(atob(B64str), (c) => c.charCodeAt(0));
  }

  /**
   * Checks if the result is an error
   *
   * @param result - The DOM result response, after writing to stdin and getting by stdout of the process
   * @param commandSent - The command sent to trigger the result
   */
  async #checkForEvaluateErrorResult(
    result: ProtocolTypes.Runtime.AwaitPromiseResponse,
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

  public static async create(client: Client, targetId: string): Promise<Page> {
    const socket = new WebSocket(
      `ws://${client.wsOptions.hostname}:${client.wsOptions.port}/devtools/page/${targetId}`,
    );
    const p = deferred();
    socket.onopen = () => p.resolve();
    await p;

    const page = new Page(
      targetId,
      client,
      socket,
    );
    await page.send("Target.attachToTarget", {
      targetId: targetId,
    });

    for (const method of ["Page", "Log", "Runtime", "Network"]) {
      await page.send(`${method}.enable`);
    }

    return page;
  }
}
