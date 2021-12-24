import { Page } from "./page.ts";
import { Protocol } from "./protocol.ts";
import { Protocol as ProtocolTypes, deferred } from "../deps.ts";
/**
 * A class to represent an element on the page, providing methods
 * to action on that element
 */
export class Element {
  /**
   * The css selector for the element
   */
  public selector: string; // eg "#user" or "div > #name" or "//h1"

  /**
   * How we select the element
   */
  public method: "document.querySelector" | "$x";

  /**
   * The page this element belongs to
   */
  private page: Page;

  #protocol: Protocol;

  #objectId?: string;

  constructor(
    method: "document.querySelector" | "$x",
    selector: string,
    page: Page,
    protocol: Protocol,
    objectId?: string,
  ) {
    this.#objectId = objectId;
    this.page = page;
    this.selector = selector;
    this.method = method;
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
      return await this.page.evaluate(
        `${this.method}('${this.selector}').value`,
      );
    }
    await this.page.evaluate(
      `${this.method}('${this.selector}').value = \`${newValue}\``,
    );
  }

  /**
   * Click the element
   * 
   * If clicking something that will open a new tab, you should use `button: "middle"`. This will
   * also wait until the new page has opened, and you can then retrieve it: const page2 = browser.pages[1]
   * 
   * If clicking something that will update the location of the page, pass true as the second parameter
   * to wait until this new location loads
   */
  public async click(options: {
    button?: "left" | "middle" | "right";
  } = {}, waitForNavigation = false): Promise<void> {
    // Scroll into view
    await this.page.evaluate(`${this.method}('${this.selector}').scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: 'instant'
    })`)

    const result = await this.#protocol.sendWebSocketMessage<
      ProtocolTypes.DOM.GetContentQuadsRequest,
      ProtocolTypes.DOM.GetContentQuadsResponse
    >("DOM.getContentQuads", {
      objectId: this.#objectId,
    });
    console.log(result);
    const layoutMetrics = await this.#protocol.sendWebSocketMessage<
      null,
      ProtocolTypes.Page.GetLayoutMetricsResponse
    >("Page.getLayoutMetrics");
    console.log(layoutMetrics);
    // Ignoring because cssLayoutMetrics is present on chrome, but notfirefox
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    const { clientWidth, clientHeight } = layoutMetrics.csslayoutViewport ?? layoutMetrics.layoutViewport;
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
    console.log(quads);
    console.log(options.button || "left")
    const quad = quads[0];
    let x = 0;
    let y = 0;
    for (const point of quad) {
      x += point.x;
      y += point.y;
    }
    x = x / 4;
    y = y / 4;
    await this.#protocol.sendWebSocketMessage<
      ProtocolTypes.Input.DispatchMouseEventRequest,
      null
    >("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      button: options.button || "left",
      modifiers: 0,
      clickCount: 1,
      x: x + (x - x) * (1 / 1),
      y,
    });
    console.log(await this.#protocol.sendWebSocketMessage<
      ProtocolTypes.Input.DispatchMouseEventRequest,
      null
    >("Input.dispatchMouseEvent", {
      type: "mousePressed",
      button: options.button || "left",
      modifiers: 0,
      clickCount: 1,
      x,
      y,
    }));
    console.log(await this.#protocol.sendWebSocketMessage<
      ProtocolTypes.Input.DispatchMouseEventRequest,
      null
    >("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      button: options.button || "left",
      modifiers: 0,
      clickCount: 1,
      x,
      y,
    }));
    if (options.button === "middle") {
      const method = "Custom.newPageCreated";
      const map = this.#protocol.notification_resolvables.set(method, deferred());
      const p = map.get(method);
      await p;
    } else if (waitForNavigation) {
      const method = "Page.loadEventFired";
      const notificationPromise = this.#protocol.notification_resolvables.get(
        method,
      );
      await notificationPromise;
      this.#protocol.notification_resolvables.delete(method);
    }
  }
}
