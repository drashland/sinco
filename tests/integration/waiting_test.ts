import { buildFor } from "../../mod.ts";

import { browserList } from "../browser_list.ts";
import { assertEquals } from "../../deps.ts";

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name +
      ": Waiting - Tutorial for this feature in the docs should work",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://drash.land");
      const elem = await page.querySelector(
        'a[href="https://discord.gg/RFsCSaHRWK"]',
      );
      await elem.click();
      await page.waitForPageChange();
      const location = await page.location();
      await browser.close();
      assertEquals(location, "https://discord.com/invite/RFsCSaHRWK");
    },
  );
}
