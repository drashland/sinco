import { buildFor } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";
import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  Deno.test("click() | It should allow clicking of elements", async () => {
    const Sinco = await buildFor(browserItem.name);
    const page = await Sinco.goTo("https://chromestatus.com");
    const elem = await page.querySelector('a[href="/roadmap"]');
    await elem.click();
    await page.waitForPageChange();
    await page.assertSee("Roadmap");
    await Sinco.done();
  });

  Deno.test("value | It should get the value for the given input element", async () => {
    const Sinco = await buildFor(browserItem.name);
    const page = await Sinco.goTo("https://chromestatus.com");
    const elem = await page.querySelector('input[placeholder="Filter"]');
    await elem.value("hello world");
    const val = await elem.value();
    assertEquals(val, "hello world");
    await Sinco.done();
  });
  Deno.test(
    "value | Should return empty when element is not an input element",
    async () => {
      const Sinco = await buildFor(browserItem.name);
      const page = await Sinco.goTo("https://chromestatus.com");
      let errMsg = "";
      const elem = await page.querySelector("div");
      try {
        await elem.value;
      } catch (e) {
        errMsg = e.message;
      }
      await Sinco.done();
      assertEquals(
        errMsg,
        "",
      );
    },
  );

  Deno.test("value() | It should set the value of the element", async () => {
    const Sinco = await buildFor(browserItem.name);
    const page = await Sinco.goTo("https://chromestatus.com");
    const elem = await page.querySelector('input[placeholder="Filter"]');
    await elem.value("hello world");
    const val = await elem.value();
    await Sinco.done();
    assertEquals(val, "hello world");
  });
}
