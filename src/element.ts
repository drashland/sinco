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
    Object.defineProperty(this, "value", {
      async set(value: string): Promise<void> {
        await client.evaluatePage(
          `${method}('${selector}').value = '${value}'`,
        );
      },
      async get(): Promise<string> {
        const value = await client.evaluatePage(
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
