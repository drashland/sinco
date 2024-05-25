import { assertEquals } from "../deps.ts";
import { Client } from "../../mod.ts";

Deno.test(
  "Evaluating a script - Tutorial for this feature in the documentation works",
  async () => {
    const { browser, page } = await Client.create();
    await page.location("https://drash.land");
    const pageTitle = await page.evaluate(() => {
      // deno-lint-ignore no-undef
      return document.querySelector("h1")?.textContent;
    });
    const sum = await page.evaluate(`1 + 10`);
    const oldBodyLength = await page.evaluate(() => {
      // deno-lint-ignore no-undef
      return document.body.children.length;
    });
    const newBodyLength = await page.evaluate(() => {
      // deno-lint-ignore no-undef
      const p = document.createElement("p");
      p.textContent = "Hello world!";
      // deno-lint-ignore no-undef
      document.body.appendChild(p);
      // deno-lint-ignore no-undef
      return document.body.children.length;
    });
    await browser.close();
    assertEquals(pageTitle, "Drash Land");
    assertEquals(sum, 11);
    assertEquals(oldBodyLength, 3);
    assertEquals(newBodyLength, 4);
  },
);
