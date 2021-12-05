import { Client } from "./client.ts";

export class Element {
  public selector: string;
  public method: "document.querySelector" | "$x";
  private client: Client;
  public value = "";

  constructor(
    method: "document.querySelector" | "$x",
    selector: string,
    client: Client,
  ) {
    this.client = client;
    this.selector = selector;
    this.method = method;
    // deno-lint-ignore no-this-alias
    const self = this;
    Object.defineProperty(this, "value", {
      async set(value: string) {
        await self.client.evaluatePage(
          `${method}('${selector}').value = '${value}'`,
        );
      },
      async get() {
        const value = await self.client.evaluatePage(
          `${method}('${selector}').value`,
        );
        return value;
      },
      configurable: true,
      enumerable: true,
    });
  }

  public async click(): Promise<void> {
    await this.client.evaluatePage(
      `${this.method}('${this.selector}').click()`,
    );
  }
}
