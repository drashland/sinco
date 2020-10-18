// https://peter.sh/experiments/chromium-command-line-switches/
import { delay } from "https://deno.land/std/async/mod.ts";


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

interface MessageResponse { // For when we send an event to get one back, eg running a JS expression
  id: number;
  result?: {
    result: { [key: string]: unknown };
  }; // Present on success
  error?: unknown; // Present on error
}

interface NotificationResponse { // Not entirely sure when, but when we send the `Network.enable` method
  method: string;
  params: unknown;
}

function sleep(milliseconds: number): void {
  const start = new Date().getTime();
  for (let i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds) {
      break;
    }
  }
}

import { deferred, readLines } from "../deps.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type ErrorResult = {
  className: string; // eg SyntaxError
  description: string; // eg SyntaxError: Unexpected Identifier
  objectId: {
    injectedScriptId: number;
    id: number;
  };
  subtype: string; // eg error
  type: string; // eg object
};

export type SuccessResult = {
  value?: string; // only present if type is a string or boolean
  type: string; // the type of result, eg object or string,
  className: string; // eg Location if command is `window.location`, only present when type is object
  description: string; // eg Location if command is `window.location`, only present when type is object
  objectId: string; // only present when type is object, eg '{"injectedScriptId":2,"id":2}'
};

export type UndefinedResult = { // not sure when this happens, but i believe it to be when the result of a command is undefined, for example if a command is `window.loction`
  type: string; // undefined
};

export type ExceptionDetails = { // exists when an error
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

export type DOMOutput = {
  result: SuccessResult | ErrorResult | UndefinedResult;
  exceptionDetails?: ExceptionDetails; // exists when an error, but an undefined response value wont trigger it, for example if the command is `window.loction`, there is no `exceptionnDetails` property, but if the command is `window.` (syntax error), this prop will exist
};

export class HeadlessBrowser {
  /**
   * The sub process that runs headless chrome
   */
  private readonly browser_process: Deno.Process;

  /**
   * Our web socket connection to the remote debugging port
   */
  private socket: WebSocket | null = null;

  /**
   * The endpoint our websocket connects to
   */
  private debug_url: string | null = null;

  /**
   * A way to keep track of the last command sent.
   * Used to display the command in the error message if
   * command errored
   */
  private last_command_sent = "";

  /**
   * A list of every command sent
   */
  private commands_sent: string[] = [];

  /**
   * A counter that acts as the message id we use to send as part of the event data through the websocket
   */
  private next_message_id = 1;

  /**
   * Are we connected to the endpoint through the websocket
   */
  public connected = false;

  /**
   * Tracks whether the user is done or not, to determine whether to reconnect to socket on disconnect
   */
  private is_done = false;

  // deno-lint-ignore allow-no-explicit-any Could MessageResponse.result or ".error
  private resolvables: { [key: number]: any } = {};

  /**
   * @param urlToVisit - The url to visit or open up
   */
  constructor(urlToVisit: string) {
    let chromePath = "";
    switch (Deno.build.os) {
      case "darwin":
        chromePath =
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
        break;
      case "windows":
        chromePath = "start chrome";
        break;
      case "linux":
        chromePath = "TODO"; // TODO(any) Find what the path for chrome is for linux
        break;
    }
    this.browser_process = Deno.run({
      cmd: [
        chromePath,
        "--headless",
        "--remote-debugging-port=9292",
        "--disable-gpu",
        urlToVisit,
      ],
      // stdout: "piped",
      // stdin: "piped",
      // stderr: "piped"
    });
  }

  /**
   * Creates the web socket connection to the headless chrome,
   * and initialises it so we can send events
   */
  public async start() {
    // Wait until the endpoint is actually ready
    sleep(1000);

    // Now get the url to connect to
    const res = await fetch("http://localhost:9292/json/list");
    const json = await res.json();
    const debugUrl = json[0]["webSocketDebuggerUrl"];
    this.debug_url = debugUrl;
    this.socket = new WebSocket(debugUrl);

    // Due to async nature of below listeners, wait until we've enabled the network to finish this execution
    const promise = deferred();

    // Setup the connection so we can start sending events and getting actual feedback! Without this, the messages we get from the websocket (after sending) are not valid
    this.socket.onopen = () => {
      this.connected = true;
      // this bit could be replaced by calling `this.sendWebSocketMessage`, but we don't want to use await here
      this.socket!.send(JSON.stringify({
        method: "Network.enable",
        id: this.next_message_id,
      }));
      this.next_message_id++;
      promise.resolve();
    };

    // Listen for all events
    this.socket.onmessage = (event) => {
      const message: MessageResponse | NotificationResponse = JSON.parse(
        event.data,
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
    };

    // general socket handlers
    this.socket.onclose = () => {
      this.connected = false;
      if (this.is_done === false) {
        // todo try reconnect
        throw new Error("Unhandled. todo");
      }
    };
    this.socket.onerror = (e) => {
      throw new Error("Error encountered");
    };

    await promise;
  }

  /**
   * Main method to handle sending messages/events to the websocket endpoint.
   *
   * @param method - Any DOMAIN, see sidebar at https://chromedevtools.github.io/devtools-protocol/tot/, eg Runtime.evaluate, or DOM.getDocument
   * @param params - Parameters required for the domain method
   *
   * @returns
   */
  protected async sendWebSocketMessage(
    method: string,
    params?: { [key: string]: unknown },
  ): Promise<unknown> {
    if (this.connected && this.socket) {
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
      this.socket.send(JSON.stringify(data));
      return await pending;
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
    // Get document so we can get the node id
    //const document = await this.sendWebSocketMessage("DOM.getDocument")
    //const child = (document as { root: { children: Array<{ nodeId: number, localName: string}> }}).root.children.find(c => c.localName === "html")
    //const documentId = child!.nodeId
    // Use  node  id  to get  the  element
    // const element = await this.sendWebSocketMessage("DOM.querySelector", {
    //   selector: selector,
    //   nodeId: documentId
    // })
    //const elementId = (element as { nodeId: number }).nodeId
    // Use element node id to get X and Y co-ords
    // const box = await this.sendWebSocketMessage("DOM.getBoxModel", {
    //   nodeId: elementId
    // })
    // Click element using co-ords
    // let clickResult = await this.sendWebSocketMessage("Input.dispatchMouseEvent", {
    //   type: "mousePressed",
    //   x: (box as { model: { width: number }}).model.width,
    //   y: (box as { model: { height: number }}).model.height,
    //   button: 'left',
    //   clickCount: 1
    // })
    // clickResult = await this.sendWebSocketMessage("Input.dispatchMouseEvent", {
    //   type: "mouseReleased",
    //   x: (box as { model: { width: number }}).model.width,
    //   y: (box as { model: { height: number }}).model.height,
    //   button: 'left',
    //   clickCount: 1
    // })
    const command = `document.querySelector('${selector}').click()`;
    const result = await this.sendWebSocketMessage("Runtime.evaluate", {
      expression: command,
    });
    if ("type" in (result as DOMOutput).result) {
      if ((result as DOMOutput).result.type === "undefined") {
        // no errors
      }
    }
    this.checkForErrorResult((result as DOMOutput), command);
    // TODO(any) we might need to wait here, because clicking something could be too fast and the next command might not work eg submit button for form, how do we know or how do we wait? The submission might send us to a different page but by then, the console is cleared and the next command(s) won't runn
    // ...
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
   * Wait for an AJAX request to finish, for example whe submitting a form,
   * wait for the request to complete before doing anything else
   */
  public async waitForAjax(): Promise<void> {
    const res = await this.sendWebSocketMessage("Runtime.evaluate", {
      expression: "!$.active",
    });
    this.checkForErrorResult((res as DOMOutput), "!$.active");
  }

  /**
   * Close/stop the sub process. Must be called when finished with all your testing
   */
  public async done(): Promise<void> {
    this.is_done = true;
    this.browser_process.close();
    this.socket!.close();
    await delay(0)
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

  /**
   * Checks if the result is an error
   *
   * @param result - The DOM result response, after writing to stdin and getting by stdout of the process
   * @param commandSent - The command sent to trigger the result
   */
  protected checkForErrorResult(result: DOMOutput, commandSent: string): void {
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
