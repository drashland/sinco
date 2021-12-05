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
    const self = this;
    Object.defineProperty(this, "value", {
      async set(value: string) {
        await self.client.evaluatePage(
          `${self.method}('${self.selector}').value = '${value}'`,
        );
      },
      async get() {
        const value = await self.client.evaluatePage(
          `${self.method}('${self.selector}').value`,
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
