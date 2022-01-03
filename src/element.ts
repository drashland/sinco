import { Page } from "./page.ts";
import { Protocol } from "./protocol.ts";
import { deferred, Protocol as ProtocolTypes } from "../deps.ts";
import { existsSync, generateTimestamp } from "./utility.ts";
import { ScreenshotOptions } from "./interfaces.ts";
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
   * Get the value of this element, or set the value
   *
   * @param newValue - If not passed, will return the value, else will set the value
   *
   * @returns The value if setting, else void if not
   */
  public async value(newValue?: string) {
    if (!newValue) {
      return await this.#page.evaluate(
        `${this.#method}('${this.#selector}').value`,
      );
    }
    await this.#page.evaluate(
      `${this.#method}('${this.#selector}').value = \`${newValue}\``,
    );
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
        `The provided folder path - ${path} doesn't exist`,
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

    const res = await this.#protocol.sendWebSocketMessage<
      ProtocolTypes.Page.CaptureScreenshotRequest,
      ProtocolTypes.Page.CaptureScreenshotResponse
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
      await this.#page.client.close();
      throw new Error(e.message);
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
   * @param options.button - If you should left, mdidle, or right click the element
   * @param waitForNavigation - If clicking an element that will change the page location, set to true. Will wait for the new location to load
   */
  public async click(options: {
    button?: "left" | "middle" | "right";
  } = {}, waitForNavigation = false): Promise<void> {
    /**
     * This whole process doesnt work for firefox.. we get no events of a new tab opening. If you remove headless,
     * and tyr open a new tab manually or middle clicky ourself, you get no events. Not sure if it's our fault or a CDP
     * problem, but some related links are https://github.com/puppeteer/puppeteer/issues/6932 and
     * https://github.com/puppeteer/puppeteer/issues/7444
     */
    if (
      this.#page.client.browser === "firefox" && options.button === "middle"
    ) {
      await this.#page.client.close(
        "Middle clicking in firefox doesn't work at the moment. Please mention on our Discord if you would like to discuss it.",
      );
    }

    if (!options.button) options.button = "left";
    // Scroll into view
    await this.#page.evaluate(
      `${this.#method}('${this.#selector}').scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: 'instant'
    })`,
    );

    // Get details we need for dispatching input events on the element
    const result = await this.#protocol.sendWebSocketMessage<
      ProtocolTypes.DOM.GetContentQuadsRequest,
      ProtocolTypes.DOM.GetContentQuadsResponse
    >("DOM.getContentQuads", {
      objectId: this.#objectId,
    });
    const layoutMetrics = await this.#protocol.sendWebSocketMessage<
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
    for (const point of quad) {
      x += point.x;
      y += point.y;
    }
    x = x / 4;
    y = y / 4;
    console.log(quad);
    const buttonsMap = {
      left: 1,
      right: 2,
      middle: 4,
    };
    console.log(
      await this.#protocol.sendWebSocketMessage("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        button: options.button,
        modifiers: 0,
        clickCount: 1,
        x: x + (x - x) * (1 / 1),
        y,
        buttons: buttonsMap[options.button],
      }),
    );
    console.log(
      await this.#protocol.sendWebSocketMessage("Input.dispatchMouseEvent", {
        type: "mousePressed",
        button: options.button,
        modifiers: 0,
        clickCount: 1,
        x,
        y,
        buttons: buttonsMap[options.button],
      }),
    );
    console.log(
      await this.#protocol.sendWebSocketMessage("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        button: options.button,
        modifiers: 0,
        clickCount: 1,
        x,
        y,
        buttons: buttonsMap[options.button],
      }),
    );
    if (options.button === "middle") {
      const method = "Custom.newPageCreated";
      const map = this.#protocol.notification_resolvables.set(
        method,
        deferred(),
      );
      const p = map.get(method);
      await p;
      this.#protocol.notification_resolvables.delete(method);
    } else if (waitForNavigation) {
      const method2 = "Page.frameStoppedLoading";
      this.#protocol.notification_resolvables.set(
        method2,
        deferred(),
      );
      const notificationPromise2 = this.#protocol.notification_resolvables.get(
        method2,
      );
      await notificationPromise2;
      this.#protocol.notification_resolvables.delete(method2);
    }
  }
}
