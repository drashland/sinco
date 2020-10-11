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

import {Cookie, readLines} from "../deps.ts";

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
        chromePath = "TODO"; // TODO(any) Finnd what the path for chrome is for linux
        break;
    }
    this.browser_process = Deno.run({
      cmd: [
        chromePath,
        "--headless",
        "--virtual-time-budget=10000",
        "--repl",
        urlToVisit,
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
  }

  /**
   * Clicks a button with the given selector
   * Will not allow clicking links, you can check
   * a link works by just checking the href
   *
   *     await this.click("#username");
   *     await this.click('button[type="submit"]')
   *
   * @param selector - The tag name, id or class
   */
  public async click(selector: string): Promise<void> {
    if (selector.indexOf("href") !== -1) {
      throw new Error(
        "Clicking links is not supported. You can check a link works by getting the `href` attribute",
      );
    }
    const command = `document.querySelector('${selector}').click()`;
    await this.writeCommandToProcess(command);
    // TODO(#7) When we can read output at any time, check if result has errors
    // this.getCommandFromProcess // gets command and checks for errors
    // TODO(any) we might need to wait here, because clicking something could be too fast and the next command might not work eg submit button for form, how do we know or how do we wait? The submission might send us to a different page but by then, the console is cleared and the next command(s) won't runn
    // ...
  }

  /**
   * Gets the text for the given selector
   * Must be an input element
   *
   * @param selector - eg input[type="submit"] or #submit
   *
   * @returns The text inside the selector, eg could be "" or "Edward"
   */
  public async getInputValue(selector: string): Promise<string> {
    const command = `document.querySelector('${selector}').value`;
    await this.writeCommandToProcess(command);
    const result = await this.getOutputFromProcess();
    const value = (result.result as SuccessResult).value;
    if (!value) { // purely to stop tsc from complaining
      throw new Error("todo"); // TODO(any) In what scenarios would the command not return a value?
    }
    return value;
  }

  /**
   * Wait for an AJAX request to finish, for example whe submitting a form,
   * wait for the request to complete before doing anything else
   */
  public async waitForAjax(): Promise<void> {
    const command = "!$.active";
    await this.writeCommandToProcess(command);
    // TODO(#7) When we can read output at any time, check if result has errors
    // await this.getCommandFromProcess // gets command and checks for errors
  }

  /**
   * Close/stop the sub process. Must be called when finished with all your testing
   */
  public async done(): Promise<void> {
    await this.browser_process.stderrOutput(); // we haven't closed this yet
    await this.browser_process.output();
    // await this.browser_process.stdin.close() // Close stdin too
    this.browser_process.close();
  }

  /**
   * Set a cookie
   *
   * @param cookie - An object containing the cookie data to set. See https://deno.land/std@0.74.0/http/cookie.ts#L9
   */
  public async setCookie (cookie: Cookie): Promise<void> {
    let command = 'document.cookie = "'
    Object.keys(cookie).forEach(key => {
      command += `${key}=${cookie[key]}; `
    });
    command += '"'
    await this.writeCommandToProcess(command)
    // TODO(#7) When we can read output at any time, check if result has errors
    // await this.getCommandFromProcess // gets command and checks for errors
  }

  /**
   * Delete a cookie by the name
   *
   * @param cookieName - The name of the cookie to delete
   */
  public async delCookie (cookieName: string): Promise<void> {
    const date = new Date();
    date.setTime(date.getTime() + 24 * 60 * 60 * 1000);
    const expires = date.toUTCString();
    const command = `document.cookie = "${name}=; expires=${expires};`
    await this.writeCommandToProcess(command)
    // TODO(#7) When we can read output at any time, check if result has errors
    // await this.getCommandFromProcess // gets command and checks for errors
  }

  /**
   * Get a cookie by its name
   *
   * @param cookieName - The name of the cookie to get
   *
   * @returns The cookie value, or null if the cookie doesn't exist
   */
  public async getCookie (cookieName: string): Promise<string|null> {
    await this.writeCommandToProcess("document.cookie")
    // TODO(#7) When we can read output at any time, check if result has errors
    // await this.getCommandFromProcess // gets command and checks for errors
    const cookies = await this.getOutputFromProcess()
    const parts = (cookies.result as SuccessResult).value.split(`${name}=`)
    if (parts.length) {
      return parts.pop().split(';').shift()
    } else { // cookie didn't exist
      return null
    }
  }

  /**
   * Type into an input element, by the given name attribute
   *
   *     <input name="city"/>
   *
   *     await this.type("city", "Stockholm")
   *
   * @param inputName - The value for the name attribute of the input to type into
   * @param value - The value to set the input to
   */
  public async type(inputName: string, value: string): Promise<void> {
    // TODO should we remove the hardcoded input bit, and allow the user to specify the selector? means this method could be more generic, allowing users to get an input value based on a class or something
    const command =
      `document.querySelector('input[name="${inputName}"]').value = ${value}`;
    await this.writeCommandToProcess(command);
    // TODO(#7) When we can read output at any time, check if result has errors
    // await this.getCommandFromProcess // gets command and checks for errors
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

  /**
   * Writes stdin to the process, and closes the stdin afteer
   *
   * @param command - The text to write
   */
  protected async writeCommandToProcess(command: string): Promise<void> {
    //await this.browser_process.stdin!.write(encoder.encode(command));
    if (!this.browser_process.stdin) {
      throw new Error("TODO");
    }
    await Deno.writeAll(
      this.browser_process.stdin,
      new TextEncoder().encode(command),
    );
    this.commands_sent.push(command);
    await this.browser_process.stdin!.close(); // We need this, otherwise process hangs when we try do p.output()
    this.last_command_sent = command;
  }

  /**
   * Get's the output from the process, and formats the result
   * into JSON
   *
   * @returns A JSON object, which is just the raw output string converted into JSON
   */
  protected async getOutputFromProcess(): Promise<DOMOutput> {
    if (!this.browser_process.stdout) {
      throw new Error("TODO");
    }
    // Raw output looks like:
    //
    //   >>> {"prop": { ... }, ... }
    //   >>>
    //
    //
    // So just clean it up a bit
    let rawOutput = "";
    for await (let line of readLines(this.browser_process.stdout)) {
      line = line
        .replace(">>> ", "") // strip from first line
        .replace(">>>", "") // strip from second
        .replace("\n", ""); // remove the pesky new lines so we can convert to json
      if (line !== "") {
        rawOutput = line;
      }
    }
    //const rawOutput = decoder.decode(await this.browser_process.output())
    //const output = rawOutput
    //.replace(">>> ", "") // strip from first line
    //.replace(">>>", "") // strip from second
    //.replace("\n", "") // remove the pesky new lines so we can convert to json

    // And it's a JSON string, so lets convert it to JSON cause JSON FTW
    const json: DOMOutput = JSON.parse(rawOutput);
    this.checkForErrorResult(json, this.last_command_sent);
    return json;
  }
}
