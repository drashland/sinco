import { assertEquals } from "../../deps.ts";
import { build } from "../../mod.ts";

Deno.test("manipulate_page_test.ts", async (t) => {
  await t.step("Manipulate Webpage", async () => {
    const { browser, page } = await build();
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

  await t.step(
    "Evaluating a script - Tutorial for this feature in the documentation works",
    async () => {
      const { browser, page } = await build();
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
      // TODO :: Do this test but for remote as well
      assertEquals(oldBodyLength, 3);
      assertEquals(newBodyLength, 4);
    },
  );
});
