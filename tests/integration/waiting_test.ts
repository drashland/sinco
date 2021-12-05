import { buildFor } from "../../mod.ts";

import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name +
      ": Waiting - Tutorial for this feature in the docs should work",
    async () => {
      const Sinco = await buildFor(browserItem.name);
      await Sinco.location("https://drash.land");
      await Sinco.assertUrlIs("https://drash.land/");
      const elem = await Sinco.querySelector(
        'a[href="https://discord.gg/RFsCSaHRWK"]',
      );
      await elem.click();
      await Sinco.waitForPageChange();
      await Sinco.assertUrlIs("https://discord.com/invite/RFsCSaHRWK");
      await Sinco.done();
    },
  );
}
