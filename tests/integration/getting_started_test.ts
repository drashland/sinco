import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";
import { assertEquals } from "../../deps.ts";

for (const browserItem of browserList) {
  Deno.test(browserItem.name, async (t) => {
    await t.step(
      "Tutorial for Getting Started in the docs should work",
      async () => {
        // Setup
        const { browser, page } = await buildFor(browserItem.name); // also supports firefox
        await page.location("https://drash.land"); // Go to this page

        // Do any actions and assertions, in any order
        assertEquals(await page.location(), "https://drash.land/");
        const elem = await page.querySelector(
          'a[href="https://discord.gg/RFsCSaHRWK"]',
        );
        await elem.click({
          waitFor: "navigation",
        }); // This element will take the user to Sinco's documentation
        const location = await page.location();

        // Once finished, close to clean up any processes
        await browser.close();
        assertEquals(location, "https://discord.com/invite/RFsCSaHRWK");
      },
    );
  });
}
