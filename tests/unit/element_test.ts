import { buildFor } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";
import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  Deno.test("click() | It should allow clicking of elements that will open a new page", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://chromestatus.com");
    const elem = await page.querySelector('a[href="/roadmap"]');
    await elem.click({
      button: "middle"
    });
    await page.waitForPageChange();
    await page.assertSee("Roadmap");
    await browser.done();
  });

  Deno.test("value | It should get the value for the given input element", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://chromestatus.com");
    const elem = await page.querySelector('input[placeholder="Filter"]');
    await elem.value("hello world");
    const val = await elem.value();
    assertEquals(val, "hello world");
    await browser.done();
  });
  Deno.test(
    "value | Should return empty when element is not an input element",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://chromestatus.com");
      let errMsg = "";
      const elem = await page.querySelector("div");
      try {
        await elem.value;
      } catch (e) {
        errMsg = e.message;
      }
      await browser.done();
      assertEquals(
        errMsg,
        "",
      );
    },
  );

  Deno.test("value() | It should set the value of the element", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://chromestatus.com");
    const elem = await page.querySelector('input[placeholder="Filter"]');
    await elem.value("hello world");
    const val = await elem.value();
    await browser.done();
    assertEquals(val, "hello world");
  });
}
