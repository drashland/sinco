import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";
import { assertEquals } from "../../deps.ts";
import { waiter } from "../../src/utility.ts";
const remote = Deno.args.includes("--remoteBrowser");

for (const browserItem of browserList) {
  Deno.test(browserItem.name, async (t) => {
    await t.step(
      "Visit pages - Tutorial for this feature in the docs should work",
      async () => {
        remote && await waiter();
        const { browser, page } = await buildFor(browserItem.name, {remote});
        await page.location("https://drash.land");
        const location = await page.location();
        await browser.close();
        assertEquals(location, "https://drash.land/");
      },
    );
  });
}
