// https://peter.sh/experiments/chromium-command-line-switches/

// Success response
// switch (result.result.type) {
//   case "object":
//     console.log('Result is an object')
//     break
//   case "string":
//     console.log("Result is a string")
//     break
//   case "undefined":
//     console.log('Command output returned undefined')
//     break
//   default:
//     throw new Error("Unhandled result type: " + result["result"]["type"])
// }

import {assertEquals, deferred, delay } from "../deps.ts";
import { existsSync } from "./utility.ts";

interface MessageResponse { // For when we send an event to get one back, eg running a JS expression
  id: number;
  result?: unknown; // Present on success
  error?: unknown; // Present on error
}

interface NotificationResponse { // Not entirely sure when, but when we send the `Network.enable` method
  method: string;
  params: unknown;
}

type ErrorResult = {
  className: string; // eg SyntaxError
  description: string; // eg SyntaxError: Unexpected Identifier
  objectId: {
    injectedScriptId: number;
    id: number;
  };
  subtype: string; // eg error
  type: string; // eg object
};

type SuccessResult = {
  value?: string; // only present if type is a string or boolean
  type: string; // the type of result, eg object or string,
  className: string; // eg Location if command is `window.location`, only present when type is object
  description: string; // eg Location if command is `window.location`, only present when type is object
  objectId: string; // only present when type is object, eg '{"injectedScriptId":2,"id":2}'
};

type UndefinedResult = { // not sure when this happens, but i believe it to be when the result of a command is undefined, for example if a command is `window.loction`
  type: string; // undefined
};

type ExceptionDetails = { // exists when an error
  columnNumber: number;
  exception: {
    className: string; // eg SyntaxError
    description: string; // eg SyntaxError: Uncaught identifier
    objectId: string; // only present when type is object, eg '{"injectedScriptId":2,"id":2}'
    subtype: string; // eg error
    type: string; // eg object
  };
  exceptionId: number;
  lineNumber: number;
  scriptId: string; // eg "12"
  text: string; // eg Uncaught
};

type DOMOutput = {
  result: SuccessResult | ErrorResult | UndefinedResult;
  exceptionDetails?: ExceptionDetails; // exists when an error, but an undefined response value wont trigger it, for example if the command is `window.loction`, there is no `exceptionnDetails` property, but if the command is `window.` (syntax error), this prop will exist
};

export class HeadlessBrowser {
  /**
   * The sub process that runs headless chrome
   */
  private browser_process: Deno.Process | null = null;

  /**
   * Our web socket connection to the remote debugging port
   */
  private socket: WebSocket | null = null;

  /**
   * A counter that acts as the message id we use to send as part of the event data through the websocket
   */
  private next_message_id = 1;

  /**
   * Tracks whether the user is done or not, to determine whether to reconnect to socket on disconnect
   */
  private is_done = false;

  // deno-lint-ignore allow-no-explicit-any Could MessageResponse.result or ".error
  private resolvables: { [key: number]: any } = {};

  constructor() {
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Build the headless browser
   */
  public async build () {
    const paths = {
      windows_chrome_exe:
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      windows_chrome_exe_x86:
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      linux: "/usr/bin/google-chrome",
    };
    let chromePath = "";
    switch (Deno.build.os) {
      case "darwin":
        chromePath = paths.darwin;
        break;
      case "windows":
        if (existsSync(paths.windows_chrome_exe)) {
          chromePath = paths.windows_chrome_exe;
          break;
        }
        if (existsSync(paths.windows_chrome_exe_x86)) {
          chromePath = paths.windows_chrome_exe_x86;
          break;
        }
        throw new Error(
            "Cannot find path for chrome in windows. Submit an issue if you encounter this error",
        );
      case "linux":
        chromePath = paths.linux;
        break;
    }
    this.browser_process = Deno.run({
      cmd: [
        chromePath,
        "--headless",
        "--remote-debugging-port=9292",
        "--disable-gpu",
        "https://chromestatus.com"
      ],
      stderr: "piped", // so stuff isn't displayed in the terminal for the user
    });
    let debugUrl = "";
    while (true) {
      try {
        const res = await fetch("http://localhost:9292/json/list");
        const json = await res.json();
        debugUrl = json[0]["webSocketDebuggerUrl"];
        break;
      } catch (err) {
        // do nothing, loop again until the endpoint is ready
      }
    }
    this.socket = new WebSocket(debugUrl);
    this.socket.onmessage = (msg) => {
      this.handleSocketMessage(msg)
    }
    const promise = deferred();
    this.socket.onopen = function () {
      promise.resolve()
    };
    await promise;
  }

  /**
   * Asserts a given url matches the current
   *
   * @param expectedUrl - The expected url, eg `https://google.com/hello`
   */
  public async assertUrlIs(expectedUrl: string): Promise<void> {
    // There's a whole bunch of other data it responds with, but we only care about documentURL
    const res = await this.sendWebSocketMessage("DOM.getDocument") as {
      root: {
        documentURL: string
      }
    };
    const actualUrl = res.root.documentURL;
    assertEquals(actualUrl, expectedUrl);
  }

  /**
   * Check if the given text exists on the dom
   *
   * @param text - The text to check for
   */
  public async assertSee(text: string): Promise<void> {
    const command = `document.body.innerText.indexOf('${text}') >= 0`;
    const res = await this.sendWebSocketMessage("Runtime.evaluate", {
      expression: command,
    });
    this.checkForErrorResult((res as DOMOutput), command);
    // Tried and tested, and `result` is `{result: { type: "boolean", value: false } }`
    const exists = ((res as DOMOutput).result as SuccessResult).value;
    assertEquals(exists, true);
  }

  /**
   * Go to a specific page
   *
   * @param urlToVisit - The page to go to
   */
  public async goTo(urlToVisit: string) {
    const res = await this.sendWebSocketMessage("Page.navigate", {
      url: urlToVisit,
    }) as {
      frameId: string,
      loaderId: string,
      errorText?: string // Only present when an error occurred, eg page doesn't exist
    };
    if (res.errorText) {
      await this.done()
      throw new Error(`"${res.errorText}" for navigating to page "${urlToVisit}`)
    }
  }

  /**
   * Clicks a button with the given selector
   *
   *     await this.click("#username");
   *     await this.click('button[type="submit"]')
   *
   * @param selector - The tag name, id or class
   */
  public async click(selector: string): Promise<void> {
    const command = `document.querySelector('${selector}').click()`;
    const result = await this.sendWebSocketMessage("Runtime.evaluate", {
      expression: command,
    });
    this.checkForErrorResult((result as DOMOutput), command);
    await delay(1000); // Need to wait, so click action has time to run before user sends next action
  }

  /**
   * Gets the text for the given selector
   * Must be an input element
   *
   * @param selector - eg input[type="submit"] or #submit
   *
   * @throws When:
   *     - Error with the element (using selector)
   *
   * @returns The text inside the selector, eg could be "" or "Edward"
   */
  public async getInputValue(selector: string): Promise<string> {
    const command = `document.querySelector('${selector}').value`;
    const res = await this.sendWebSocketMessage("Runtime.evaluate", {
      expression: command,
    });
    const type = (res as DOMOutput).result.type;
    if (type === "undefined") { // not an input elem
      return "undefined";
    }
    this.checkForErrorResult((res as DOMOutput), command);
    const value = ((res as DOMOutput).result as SuccessResult).value;
    return value || "";
  }

  /**
   * Close/stop the sub process, and close the ws connection. Must be called when finished with all your testing
   */
  public async done(): Promise<void> {
    // FIXME :: Something to do with the socket isnt closing
    await delay(1000); // If we try close before the ws endpoint has not finished sending all messages from the Network.enable method, async ops are leaked
    this.is_done = true;
    this.browser_process!.stderr!.close();
    this.browser_process!.close();
    const promise = deferred();
    this.socket!.onclose = function () {
      promise.resolve()
    };
    this.socket!.close();
    await promise;
  }

  /**
   * Type into an input element, by the given selector
   *
   *     <input name="city"/>
   *
   *     await this.type('input[name="city"]', "Stockholm")
   *
   * @param selector - The value for the name attribute of the input to type into
   * @param value - The value to set the input to
   */
  public async type(selector: string, value: string): Promise<void> {
    const command = `document.querySelector('${selector}').value = "${value}"`;
    const res = await this.sendWebSocketMessage("Runtime.evaluate", {
      expression: command,
    });
    this.checkForErrorResult((res as DOMOutput), command);
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PRIVATE ///////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  private handleSocketMessage(msg: MessageEvent) {
    if (this.is_done) {
      return;
    }
    const message: MessageResponse | NotificationResponse = JSON.parse(
      msg.data,
    );
    if ("id" in message) { // message response
      const resolvable = this.resolvables[message.id];
      if (resolvable) {
        if ("result" in message) { // success response
          resolvable.resolve(message.result);
        }
        if ("error" in message) { // error response
          // todo throw error  using error message
          resolvable.reject(message.error);
        }
      }
    }
  }

  /**
   * Main method to handle sending messages/events to the websocket endpoint.
   *
   * @param method - Any DOMAIN, see sidebar at https://chromedevtools.github.io/devtools-protocol/tot/, eg Runtime.evaluate, or DOM.getDocument
   * @param params - Parameters required for the domain method
   *
   * @returns
   */
  private async sendWebSocketMessage(
    method: string,
    params?: { [key: string]: unknown },
  ): Promise<unknown> {
    const data: {
      id: number;
      method: string;
      params?: { [key: string]: unknown };
    } = {
      id: this.next_message_id++,
      method: method,
    };
    if (params) data.params = params;
    const pending = this.resolvables[data.id] = deferred();
    this.socket!.send(JSON.stringify(data));
    const result = await pending;
    delete this.resolvables[data.id]
    return result
  }

  /**
   * Checks if the result is an error
   *
   * @param result - The DOM result response, after writing to stdin and getting by stdout of the process
   * @param commandSent - The command sent to trigger the result
   */
  private checkForErrorResult(result: DOMOutput, commandSent: string): void {
    // Is an error
    if (result.exceptionDetails) { // Error with the sent command, maybe there is a syntax error
      const exceptionDetail = (result.exceptionDetails as ExceptionDetails);
      const errorMessage = exceptionDetail.exception.description;
      if (exceptionDetail.exception.description.indexOf("SyntaxError") > -1) { // a syntax error
        const message = errorMessage.replace("SyntaxError: ", "");
        throw new SyntaxError(message + ": `" + commandSent + "`");
      } else { // any others, unsure what they'd be
        throw new Error(`${errorMessage}: "${commandSent}"`);
      }
    }
  }
}
