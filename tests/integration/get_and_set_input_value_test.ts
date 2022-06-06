import { assertEquals } from "../../deps.ts";
import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";

const remote = Deno.args.includes("--remoteBrowser");

for (const browserItem of browserList) {
  Deno.test(browserItem.name, async (t) => {
    await t.step(
      "Get and set input value - Tutorial for this feature in the docs should work",
      async () => {
        const { browser, page } = await buildFor(browserItem.name, { remote });
        await page.location("https://chromestatus.com");
        const elem = await page.querySelector('input[placeholder="Filter"]');
        await elem.value("hello world");
        const val = await elem.value();
        assertEquals(val, "hello world");
        await browser.close();
      },
    );
  });
}
