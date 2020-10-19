import {
  DOMOutput,
  HeadlessBrowser, sleep,
  SuccessResult,
} from "./headless_browser.ts";
import { assertEquals } from "../deps.ts";

/**
 * visit
 *     Initial method to call on `Dawn`. Sets the ulr to visit
 */
// interface IDawn {
//   visit(url: string): Test
// }

/**
 * Entry point module
 *
 *     await Dawn().visit("...").click().assertPathIs(...)
 *
 * @constructor
 */
// export function Dawn (): IDawn {
//   const obj: Record<string, any> = {
//     visit: (url: string) => {
//       const p = Deno.run({
//         cmd: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--headless", "--crash-dump-dir=/tmp", "--repl", url],
//         stdin: "piped",
//         stdout: "piped",
//         stderr: "piped"
//       })
//       return new Test(
//           url, p
//       )
//     }
//   }
//   return obj as IDawn
// }

/**
 * Responsible for assertions, and exposing the Headless Browser methods
 */
export class Dawn extends HeadlessBrowser {
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
    sleep(1000)
    const command =
      `document.documentElement.innerText.indexOf('${text}') >= 0`;
    const res = await this.sendWebSocketMessage("Runtime.evaluate", {
      expression: command,
    });
    this.checkForErrorResult((res as DOMOutput), command);
    // Tried and tested, and `result` is `{result: { type: "boolean", value: false } }`
    const exists = ((res as DOMOutput).result as SuccessResult).value;
    assertEquals(exists, true);
  }
}
