import {
  DOMOutput,
  HeadlessBrowser,
  sleep,
  SuccessResult,
} from "./headless_browser.ts";
import { assertEquals } from "../deps.ts";

/**
 * Responsible for assertions, and exposing the Headless Browser methods
 */
export class Cinco extends HeadlessBrowser {
  /**
   * @param urlToVisit - Which url are we visiting?
   */
  constructor(urlToVisit: string) {
    super(urlToVisit);
  }

  /**
   * Asserts a given url matches the current
   *
   * @param expectedUrl - The expected url, eg `https://google.com/hello`
   */
  public async assertUrlIs(expectedUrl: string): Promise<void> {
    sleep(500)
    const res = await this.sendWebSocketMessage("DOM.getDocument");
    const actualUrl =
      (res as { root: { documentURL: string } }).root.documentURL;
    assertEquals(actualUrl, expectedUrl);
  }

  /**
   * Check if the given text exists on the dom
   *
   * @param text - The text to check for
   */
  public async assertSee(text: string): Promise<void> {
    sleep(500)
    const command =
      `document.body.innerText.indexOf('${text}') >= 0`;
    const res = await this.sendWebSocketMessage("Runtime.evaluate", {
      expression: command,
    });
    this.checkForErrorResult((res as DOMOutput), command);
    // Tried and tested, and `result` is `{result: { type: "boolean", value: false } }`
    const exists = ((res as DOMOutput).result as SuccessResult).value;
    assertEquals(exists, true);
  }
}
