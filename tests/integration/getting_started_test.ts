import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name + ": Tutorial for Getting Started in the docs should work",
    async () => {
      // Setup
      const Sinco = await buildFor(browserItem.name); // also supports firefox
      await Sinco.location("https://drash.land"); // Go to this page

      // Do any actions and assertions, in any order
      await Sinco.assertUrlIs("https://drash.land/");
      const elem = await Sinco.querySelector(
        'a[href="https://discord.gg/RFsCSaHRWK"]',
      );
      await elem.click(); // This element will take the user to Sinco's documentation
      await Sinco.waitForPageChange();
      await Sinco.assertUrlIs("https://discord.com/invite/RFsCSaHRWK");

      // Once finished, close to clean up any processes
      await Sinco.done();
    },
  );
}
