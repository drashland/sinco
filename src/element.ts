import { Page } from "./page.ts";
import { deferred, Protocol as ProtocolTypes } from "../deps.ts";
import { ScreenshotOptions } from "./interfaces.ts";
import { waitUntilNetworkIdle } from "./utility.ts";

// Eg if parameter is a string
type Click<T> = T extends "middle" ? Page
  : void;
type WaitFor = "navigation" | "newPage";

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
  readonly #method = "document.querySelector"; // | "$x";

  /**
   * The page this element belongs to
   */
  readonly #page: Page;

  /**
   * ObjectId belonging to this element
   */
  readonly #objectId: string;

  readonly #node: ProtocolTypes.DOM.Node;

  /**
   * @param method - The method we use for query selecting
   * @param selector - The CSS selector
   * @param page - The page this element belongs to
   * @param objectId - The object id assigned to the element
   */
  constructor(
    selector: string,
    page: Page,
    node: ProtocolTypes.DOM.Node,
    objectId: string,
  ) {
    this.#node = node;
    this.#objectId = objectId;
    this.#page = page;
    this.#selector = selector;
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

    await this.#page.send<ProtocolTypes.DOM.SetFileInputFilesRequest, null>(
      "DOM.setFileInputFiles",
      {
        files: files,
        objectId: this.#objectId,
        backendNodeId: this.#node.backendNodeId,
      },
    );
  }

  /**
   * Take a screenshot of the element and save it to `filename` in `path` folder, with a `format` and `quality` (jpeg format only)
   *
   * @example
   * ```ts
   * const uint8array = await element.screenshot();
   * Deno.writeFileSync('./file.jpg', uint8array);
   * ```
   *
   * @param path - The path of where to save the screenshot to
   * @param options
   *
   * @returns The data
   */
  async screenshot(
    options?: ScreenshotOptions,
  ): Promise<Uint8Array> {
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

    // Quality should defined only if format is jpeg
    const quality = (ext == "jpeg")
      ? ((options?.quality) ? Math.abs(options.quality) : 80)
      : undefined;

    const res = await this.#page.send<
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
    const u8Arr = Uint8Array.from<string>(atob(B64str), (c) => c.charCodeAt(0));

    return u8Arr;
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
   * await click(); // eg button
   * await click({ waitFor: 'navigation' }); // eg if link or form submit
   * const newPage = await click({ waitFor: 'newPage' }); // If download button or anchor tag with _BLANK
   * ```
   */
  public async click<T extends WaitFor>(options: {
    waitFor?: WaitFor;
  } = {}): Promise<Click<T>> {
    // Scroll into view
    await this.#page.evaluate(
      `${this.#method}('${this.#selector}').scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: 'instant'
    })`,
    );

    // Get details we need for dispatching input events on the element
    const result = await this.#page.send<
      ProtocolTypes.DOM.GetContentQuadsRequest,
      ProtocolTypes.DOM.GetContentQuadsResponse
    >("DOM.getContentQuads", {
      objectId: this.#objectId,
    });
    const layoutMetrics = await this.#page.send<
      null,
      ProtocolTypes.Page.GetLayoutMetricsResponse
    >("Page.getLayoutMetrics");
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

    /**
     * It could be that the element isn't clickable. Once
     * instance i've found this is when i've tried to click
     * an element `<a id=... href=... />` eg self closing.
     * Could be more reasons though
     */
    if (!quad) {
      await this.#page.client.close(
        `Unable to click the element "${this.#selector}". It could be that it is invalid HTML`,
      );
      return undefined as Click<T>;
    }

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

    await this.#page.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      button: "left",
      modifiers: 0,
      clickCount: 1,
      x: x + (x - x) * (1 / 1),
      y,
      buttons: buttonsMap.left,
    });

    // Creating this here because by the time we send the below events, and try wait for the notification, the protocol may have already got the message and discarded it
    const newPageHandler = options.waitFor === "newPage"
      ? "Page.frameRequestedNavigation"
      : null;
    if (newPageHandler) {
      this.#page.notifications.set(
        newPageHandler,
        deferred(),
      );
    }

    await this.#page.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      button: "left",
      modifiers: 0,
      clickCount: 1,
      x,
      y,
      buttons: buttonsMap.left,
    });
    await this.#page.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      button: "left",
      modifiers: 0,
      clickCount: 1,
      x,
      y,
      buttons: buttonsMap.left,
    });

    if (newPageHandler) {
      const p1 = this.#page.notifications.get(
        newPageHandler,
      );
      const { frameId } =
        await p1 as unknown as ProtocolTypes.Page.FrameRequestedNavigationEvent;
      this.#page.notifications.delete(
        newPageHandler,
      );

      return await Page.create(this.#page.client, frameId) as Click<T>;
    }
    if (options.waitFor === "navigation") {
      await waitUntilNetworkIdle();
    }

    return undefined as Click<T>;
  }
}
