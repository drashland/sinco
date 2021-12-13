import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";
import { assertEquals } from "../../deps.ts";

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name +
      ": Clicking elements - Tutorial for this feature in the docs should work",
    async () => {
      const Sinco = await buildFor(browserItem.name);
      const page = await Sinco.goTo("https://drash.land");
      const elem = await page.querySelector(
        'a[href="https://discord.gg/RFsCSaHRWK"]',
      );
      await elem.click();
      await page.waitForPageChange();
      assertEquals(
        await page.location(),
        "https://discord.com/invite/RFsCSaHRWK",
      );
      await Sinco.done();
    },
  );
}
