import { Page } from "./page.ts";

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

  constructor(
    method: "document.querySelector" | "$x",
    selector: string,
    page: Page,
  ) {
    this.page = page;
    this.selector = selector;
    this.method = method;
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
   */
  public async click(): Promise<void> {
    await this.page.evaluate(
      `${this.method}('${this.selector}').click()`,
    );
  }
}
