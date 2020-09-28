import {
  HeadlessBrowser,
  SuccessResult,
} from "./headless_browser.ts";
import {assertEquals} from "../deps.ts";

// TODO(edward) Support when using docker, support logging in (databases annd all that) (maybe), make options configurable, make options platform agnostic
// TODO Add cookie operations
// todo add method to get a value of selector (do we have this already)
// todo add method to get atttribute from selector
// todo add dialog support (typing into them and asserting if one popped up
// todo look into flags we can pass to chrome path (see headless_browser.ts at top of file)
// todo add wait for method, that sets a timeout, and after 5s (default) asserts it exists and then continues
// TODO I WANT TO ACHIEVE SYNTAX LIKE:
//   await dawn()
//     .visit()
//     .click()
//   const value = dawn().getValue(...)
//   await dawn()
//     .click(...)


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
    super(urlToVisit)
  }

  /**
   * Asserts a given url matches the current
   *
   * @param expectedUrl - The expected url, eg `https://google.com/hello`
   */
  public async assertUrlIs(expectedUrl: string): Promise<void> {
    const command = "window.location.href";
    await this.writeCommandToProcess(command)
    const result = await this.getOutputFromProcess()
    const actualUrl = (result.result as SuccessResult).value;
    assertEquals(actualUrl, expectedUrl)
  }

  /**
   * Check if the given text exists on the dom
   *
   * @param text - The text to check for
   */
  public async assertSee (text: string): Promise<void> {
    const command = `document.documentElement.innerText.indexOf('${text}') >= 0`;
    await this.writeCommandToProcess(command)
    const result = await this.getOutputFromProcess()
    // Tried and tested, and `result` is `{result: { type: "boolean", value: false } }`
    const exists = (result.result as SuccessResult).value;
    assertEquals(exists, true)
  }
}