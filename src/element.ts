import { Page } from "./page.ts";
import { Protocol } from "./protocol.ts";
import { deferred, Protocol as ProtocolTypes } from "../deps.ts";
import { existsSync, generateTimestamp } from "./utility.ts";
import { ScreenshotOptions, WebsocketTarget } from "./interfaces.ts";
/**
 * A class to represent an element on the page, providing methods
 * to action on that element
 */
export class Element {
  /**
   * The css selector for the element
   */
  readonly #selector: string; // eg "#user" or "div > #name" or "//h1"

  /**
   * How we select the element
   */
  readonly #method: "document.querySelector" | "$x";

  /**
   * The page this element belongs to
   */
  readonly #page: Page;

  /**
   * Protocol to use, attached to the page
   */
  readonly #protocol: Protocol;

  /**
   * ObjectId belonging to this element
   */
  readonly #objectId?: string;

  /**
   * @param method - The method we use for query selecting
   * @param selector - The CSS selector
   * @param page - The page this element belongs to
   * @param protocol - The protocol for the page this element belongs to
   * @param objectId - The object id assigned to the element
   */
  constructor(
    method: "document.querySelector" | "$x",
    selector: string,
    page: Page,
    protocol: Protocol,
    objectId?: string,
  ) {
    this.#objectId = objectId;
    this.#page = page;
    this.#selector = selector;
    this.#method = method;
    this.#protocol = protocol;
  }

  /**
   * Sets a file for a file input
   *
   * @param path - The remote path of the file to attach
   *
   * @example
   * ```js
   * import { resolve } from "https://deno.land/std@0.136.0/path/mod.ts";
   * const fileInput = await page.querySelector("input[type='file']");
   * await fileInput.file(resolve("./logo.png"));
   * ```
   */
  public async file(path: string): Promise<void> {
    return await this.files(path);
  }

  /**
   * Sets many files for a file input
   *
   * @param files - The list of remote files to attach
   *
   * @example
   * ```js
   * import { resolve } from "https://deno.land/std@0.136.0/path/mod.ts";
   * const fileInput = await page.querySelector("input[type='file']");
   * await fileInput.files(resolve("./logo.png"));
   * ```
   */
  public async files(...files: string[]) {
    if (files.length > 1) {
      const isMultiple = await this.#page.evaluate(
        `${this.#method}('${this.#selector}').hasAttribute('multiple')`,
      );
      if (!isMultiple) {
        throw new Error(
          "Trying to set files on a file input without the 'multiple' attribute",
        );
      }
    }

    const name = await this.#page.evaluate(
      `${this.#method}('${this.#selector}').nodeName`,
    );
    if (name !== "INPUT") {
      throw new Error("Trying to set a file on an element that isnt an input");
    }
    const type = await this.#page.evaluate(
      `${this.#method}('${this.#selector}').type`,
    );
    if (type !== "file") {
      throw new Error(
        'Trying to set a file on an input that is not of type "file"',
      );
    }

    const { node } = await this.#protocol.send<
      ProtocolTypes.DOM.DescribeNodeRequest,
      ProtocolTypes.DOM.DescribeNodeResponse
    >("DOM.describeNode", {
      objectId: this.#objectId,
    });
    await this.#protocol.send<ProtocolTypes.DOM.SetFileInputFilesRequest, null>(
      "DOM.setFileInputFiles",
      {
        files: files,
        objectId: this.#objectId,
        backendNodeId: node.backendNodeId,
      },
    );
  }

  /**
   * Get the value of this element, or set the value
   *
   * @param newValue - If not passed, will return the value, else will set the value
   *
   * @returns The value if getting, else if setting then an empty string
   */
  public async value(newValue?: string): Promise<string> {
    if (!newValue) {
      return await this.#page.evaluate(
        `${this.#method}('${this.#selector}').value`,
      );
    }
    await this.#page.evaluate(
      `${this.#method}('${this.#selector}').value = \`${newValue}\``,
    );
    return "";
  }

  /**
   * Take a screenshot of the element and save it to `filename` in `path` folder, with a `format` and `quality` (jpeg format only)
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
      await this.#page.client.close(
        `The provided folder path "${path}" doesn't exist`,
      );
    }
    const ext = options?.format ?? "jpeg";
    const rawViewportResult = await this.#page.evaluate(
      `JSON.stringify(${this.#method}('${this.#selector}').getBoundingClientRect())`,
    );
    const jsonViewportResult = JSON.parse(rawViewportResult);
    const clip = {
      x: jsonViewportResult.x,
      y: jsonViewportResult.y,
      width: jsonViewportResult.width,
      height: jsonViewportResult.height,
      scale: 2,
    };

    if (options?.quality && Math.abs(options.quality) > 100 && ext == "jpeg") {
      await this.#page.client.close(
        "A quality value greater than 100 is not allowed.",
      );
    }

    //Quality should defined only if format is jpeg
    const quality = (ext == "jpeg")
      ? ((options?.quality) ? Math.abs(options.quality) : 80)
      : undefined;

    const res = await this.#protocol.send<
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
      await this.#page.client.close(e.message);
    }

    return fName;
  }

  /**
   * Click the element
   *
   * If clicking something that will open a new tab, you should use `button: "middle"`. This will
   * also wait until the new page has opened, and you can then retrieve it: const page2 = browser.pages[1]
   *
   * If clicking something that will update the location of the page, pass true as the second parameter
   * to wait until this new location loads
   *
   * @param options
   * @param options.button - If you should left, mdidle, or right click the element. Defaults to left. If middle, will wait until the new page has loaded
   * @param options.waitFor - "navigation". If clicking an element that will change the page location, set to true. Will wait for the new location to load
   *
   * @example
   * ```js
   * // Clicking an anchor tag
   * await click({
   *   waitFor: "navigation"
   * })
   * // Clicking an anchor tag with `__BLANK`
   * await click({
   *   button: "middle",
   * })
   */
  public async click(options: {
    button?: "left" | "middle" | "right";
    waitFor?: "navigation";
  } = {}): Promise<void> {
    /**
     * TODO :: Remember to check now and then to see if this is fixed
     * This whole process doesnt work for firefox.. we get no events of a new tab opening. If you remove headless,
     * and try open a new tab manually or middle clicky ourself, you get no events. Not sure if it's our fault or a CDP
     * problem, but some related links are https://github.com/puppeteer/puppeteer/issues/6932 and
     * https://github.com/puppeteer/puppeteer/issues/7444
     */
    if (
      this.#page.client.browser === "firefox" && options.button === "middle"
    ) {
      await this.#page.client.close(
        "Middle clicking in Firefox doesn't work at the moment. Please mention on our Discord if you would like to discuss it.",
      );
    }

    if (!options.button) options.button = "left";

    // Scroll into view
    try {
      await this.#page.evaluate(
        `${this.#method}('${this.#selector}').scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'instant'
      })`,
      );
    } catch (_e) {
      await this.#page.client.close(
        `The given element ("${this.#selector}") is no longer present in the DOM`,
      );
    }

    // Get details we need for dispatching input events on the element
    const result = await this.#protocol.send<
      ProtocolTypes.DOM.GetContentQuadsRequest,
      ProtocolTypes.DOM.GetContentQuadsResponse
    >("DOM.getContentQuads", {
      objectId: this.#objectId,
    });
    const layoutMetrics = await this.#protocol.send<
      null,
      ProtocolTypes.Page.GetLayoutMetricsResponse
    >("Page.getLayoutMetrics");
    if (!result || !result.quads.length) {
      await this.#page.client.close(
        `Node is either not clickable or not an HTMLElement`,
      );
    }

    // Ignoring because cssLayoutMetrics is present on chrome, but not firefox
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    const { clientWidth, clientHeight } = layoutMetrics.csslayoutViewport ??
      layoutMetrics.layoutViewport;
    const quads = result.quads.map((quad) => {
      return [
        { x: quad[0], y: quad[1] },
        { x: quad[2], y: quad[3] },
        { x: quad[4], y: quad[5] },
        { x: quad[6], y: quad[7] },
      ];
    }).map((quad) => {
      return quad.map((point) => ({
        x: Math.min(Math.max(point.x, 0), clientWidth),
        y: Math.min(Math.max(point.y, 0), clientHeight),
      }));
    }).filter((quad) => {
      let area = 0;
      for (let i = 0; i < quad.length; ++i) {
        const p1 = quad[i];
        const p2 = quad[(i + 1) % quad.length];
        area += (p1.x * p2.y - p2.x * p1.y) / 2;
      }
      return Math.abs(area) > 1;
    });
    const quad = quads[0];
    let x = 0;
    let y = 0;
    for (const point of quad) {
      x += point.x;
      y += point.y;
    }
    x = x / 4;
    y = y / 4;
    const buttonsMap = {
      left: 1,
      right: 2,
      middle: 4,
    };

    await this.#protocol.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      button: options.button,
      modifiers: 0,
      clickCount: 1,
      x: x + (x - x) * (1 / 1),
      y,
      buttons: buttonsMap[options.button],
    });

    // Creating this here because by the time we send the below events, and try wait for the notification, the protocol may have already got the message and discarded it
    const middleClickHandler = options.button === "middle"
      ? "Page.frameRequestedNavigation"
      : null;
    if (middleClickHandler) {
      this.#protocol.notifications.set(
        middleClickHandler,
        deferred(),
      );
    }

    await this.#protocol.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      button: options.button,
      modifiers: 0,
      clickCount: 1,
      x,
      y,
      buttons: buttonsMap[options.button],
    });
    await this.#protocol.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      button: options.button,
      modifiers: 0,
      clickCount: 1,
      x,
      y,
      buttons: buttonsMap[options.button],
    });

    if (options.button === "middle" && middleClickHandler) {
      const p1 = this.#protocol.notifications.get(
        middleClickHandler,
      );
      const { url, frameId } =
        await p1 as unknown as ProtocolTypes.Page.FrameRequestedNavigationEvent;
      this.#protocol.notifications.delete(
        middleClickHandler,
      );

      // Now, any events for the page we wont get, they will be sent thru the new targets ws connection, so we need to connect first:
      // 1. Get target id of this new page
      // 2. Create ws connection and protocol instance
      // 3. Wait until the page has loaded properly and isnt about:blank
      let targetId = "";
      while (!targetId) { // The ws endpoint might not have the item straight away, so give it a tiny bit of time
        const res = await fetch(
          `http://${this.#page.client.wsOptions.hostname}:${this.#page.client.wsOptions.port}/json/list`,
        );
        const json = await res.json() as WebsocketTarget[];
        const item = json.find((j) => j.url === url);
        if (!item) {
          continue;
        }
        targetId = item.id;
      }
      await this.#protocol.send("Target.attachToTarget", {
        targetId: this.#page.target_id,
      });
      const newProt = await Protocol.create(
        `ws://${this.#page.client.wsOptions.hostname}:${this.#page.client.wsOptions.port}/devtools/page/${targetId}`,
      );
      const endpointPromise = deferred();
      const intervalId = setInterval(async () => {
        const targets = await newProt.send<
          null,
          ProtocolTypes.Target.GetTargetsResponse
        >("Target.getTargets");
        const target = targets.targetInfos.find((t) =>
          t.targetId === targetId
        ) as ProtocolTypes.Target.TargetInfo;
        if (target.title !== "about:blank") {
          clearInterval(intervalId);
          endpointPromise.resolve();
        }
      });
      await endpointPromise;

      this.#page.client._pushPage(
        new Page(newProt, targetId, this.#page.client, frameId),
      );
    } else if (options.waitFor === "navigation") { // TODO :: Should we put this into its own method? waitForNavigation() to free up the maintability f this method, allowing us to add more params later but also for the mo, not need to do `.click({}, true)` OR maybe do `.click(..., waitFor: { navigation?: boolean, fetch?: boolean, ... }), because clicking needs to support: new pages, new locations, requests (any JS stuff, maybe when js is triggered it fired an event we can hook into?)
      const method2 = "Page.frameStoppedLoading";
      this.#protocol.notifications.set(
        method2,
        deferred(),
      );
      const notificationPromise2 = this.#protocol.notifications.get(
        method2,
      );
      await notificationPromise2;
      this.#protocol.notifications.delete(method2);
    }
  }

  /**
   * Get an attribute on the element
   *
   * @example
   * ```js
   * const class = await elem.getAttribute("class"); // "form-control button"
   * ```
   *
   * @param name - The name of the attribute
   *
   * @returns The attribute value
   */
  public async getAttribute(name: string): Promise<string> {
    return await this.#page.evaluate(
      `${this.#method}('${this.#selector}').getAttribute('${name}')`,
    );
  }
  /**
   * Set an attribute on the element
   *
   * @example
   * ```js
   * await elem.setAttribute("data-name", "Sinco");
   * ```
   *
   * @param name - The name of the attribute
   * @param value - The value to set the atrribute to
   */
  public async setAttribute(name: string, value: string): Promise<void> {
    await this.#page.evaluate(
      `${this.#method}('${this.#selector}').setAttribute('${name}', '${value}')`,
    );
  }
}
