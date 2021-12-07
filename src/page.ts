import { Client } from "./client.ts";
import { Element } from "./element.ts";
import { assertEquals, deferred, Protocol } from "../deps.ts";
import { existsSync, generateTimestamp } from "./utility.ts";

export class Page extends Client {
  public location = "";
  public cookie = "";

  constructor(
    socket: WebSocket,
    browserProcess: Deno.Process,
    browser: "firefox" | "chrome",
    frameId: string,
    firefoxProfilePath?: string,
  ) {
    super(socket, browserProcess, browser, frameId, firefoxProfilePath);
    // deno-lint-ignore no-this-alias
    const self = this;
    Object.defineProperty(this, "location", {
      async set(value: string): Promise<void> {
        await self.goTo(value);
      },
      async get(): Promise<string> {
        const value = await self.evaluatePage(
          `window.location.href`,
        );
        return value;
      },
      configurable: true,
      enumerable: true,
    });
    Object.defineProperty(this, "cookie", {
      async set(data: {
        name: string;
        value: string;
        url: string;
      }): Promise<void> {
        await self.sendWebSocketMessage<
          Protocol.Network.SetCookieRequest,
          Protocol.Network.SetCookieResponse
        >("Network.setCookie", {
          name: data.name,
          value: data.value,
          url: data.url,
        });
      },
      async get(): Promise<Protocol.Network.GetCookiesResponse> {
        const cookies = await self.sendWebSocketMessage<
          Protocol.Network.GetCookiesRequest,
          Protocol.Network.GetCookiesResponse
        >("Network.getCookies", {
          urls: [await self.location],
        });
        return cookies;
      },
      configurable: true,
      enumerable: true,
    });
  }

  public async querySelector(selector: string): Promise<Element> {
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

  /**
   * Invoke a function or string expression on the current frame.
   *
   * @param pageCommand - The function to be called or the line of code to execute.
   *
   * @returns The result of the evaluation
   */
  public async evaluate(
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
}
