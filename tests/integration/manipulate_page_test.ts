import { assertEquals } from "../../deps.ts";
import { buildFor } from "../../mod.ts";

import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  Deno.test(browserItem.name + ": Manipulate Webpage", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://drash.land");

    const updatedBody = await page.evaluate(() => {
      // deno-lint-ignore no-undef
      const prevBody = document.body.children.length;
      // deno-lint-ignore no-undef
      const newEl = document.createElement("p");
      // deno-lint-ignore no-undef
      document.body.appendChild(newEl);
      // deno-lint-ignore no-undef
      return prevBody === document.body.children.length - 1;
    });
    assertEquals(updatedBody, true);

    await browser.close();
  });

  Deno.test(
    browserItem.name +
      ": Evaluating a script - Tutorial for this feature in the documentation works",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://drash.land");
      const pageTitle = await page.evaluate(() => {
        // deno-lint-ignore no-undef
        return document.title;
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
}
