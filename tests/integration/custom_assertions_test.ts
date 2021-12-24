import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";
import { assertEquals } from "../../deps.ts";

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name +
      ": Assertions - Tutorial for this feature in the docs should work",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://drash.land");
      assertEquals(await page.location(), "https://drash.land/");
      await page.assertSee("Develop With Confidence");
      await browser.done();
    },
  );
}
