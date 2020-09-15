import { createRequire } from "https://deno.land/std@v0.62.0/node/module.ts";
const require = createRequire(import.meta.url);
//import puppeteer from "https://dev.jspm.io/esprima";
//const puppeteer = require("puppeteer");
const CDP = require('chrome-remote-interface');

// TODO(edward) Further functionality:
//   - Login as
//   - Assertions
//   - Create a headless browser
//
// Other options for handling headless browsers are:
//   - karma
//   - puppeteer (once std/node implements http), and dawn wraps around puppeteer: dawn is user facing but uses puppeteer under the hood for the browser related stuff, and dawn is for everything else
//   - our own
//   - or create a wrapper around https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md (still need std/node http module though), this includes using programatically (puppeteer) or the npm module chrome-remote-interface (noted in the linked docs, still requires http)
// Seems puppeteer would be the best and easiest one to use, if we dont make our own, just need to wait for http to be developed
class Test {
  /**
   * Response object for visiting the requested url
   */
  public url_to_visit_response: Response|null = null;

  /**
   * Url to visit for the test
   */
  public url_to_visit: string = "";

  /**
   * The page object, in which we interact with
   */
  public page: any = null;

  /**
   * @param urlToVisit - Which url are we visiting?
   */
  constructor(urlToVisit: string) {
    this.url_to_visit = urlToVisit
  }

  /**
   * Click elements on the page
   *
   *     await this.click("#username");
   *
   * @param tagOrElement - The tag name, id or class
   */
  public async click (tagOrElement: string) {
    if (!this.page) {
      //await this.createBrowser()
    }
    //const [response] = await this.page.click(tagOrElement, {})
    //console.log(response) // TODO(edward) Do something with the response, eg we should re-set the this.current_url
  }

  /**
   * Compares the expected path with the visited url
   *
   * @param expectedPath - The expected url after visiting a page
   */
  public async assertPathIs (expectedPath: string) {
    await this.visitUrl();
    console.log('Asserting expected path is what you got when you visited:');
    // todo add a catch for if there is no response, meaning the user didnt do `visit()`
    console.log(expectedPath === this.url_to_visit_response!.url)
    console.log(expectedPath, this.url_to_visit_response!.url)
  }

  /**
   * Creates a browser page from puppeteer
   *
   *   await this.createBrowser();
   */
  private async createBrowser (): Promise<void> {
    //const browser = await puppeteer.launch();
    //const page = await browser.newPage();
    if (this.url_to_visit) {
      //await page.goto(this.url_to_visit);
    }
    //this.page = page
  }

  /**
   * Sets the response for visiting the url
   *
   *   this.url_to_visit = "https://google.com";
   *   await this.visitUrl();
   *   console.log(this.url_to_visit_response);
   */
  private async visitUrl (): Promise<void> {
    this.url_to_visit_response = await fetch(this.url_to_visit)
  }
}

/**
 * visit
 *     Initial method to call on `Dawn`. Sets the ulr to visit
 */
interface IDawn {
  visit(url: string): Test
}

/**
 * Entry point module
 *
 *     await Dawn().visit("...").click().assertPathIs(...)
 *
 * @constructor
 */
export function Dawn (): IDawn {
  const obj: Record<string, any> = {};
  obj["visit"] = (url: string) => {
    return new Test(
      url
    )
  };
  return obj as IDawn
}