import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";
import { assertEquals } from "../../deps.ts";

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name +
      ": Visit pages - Tutorial for this feature in the docs should work",
    async () => {
      const Sinco = await buildFor(browserItem.name);
      const page = await Sinco.goTo("https://drash.land");
      const location = await page.location();
      await Sinco.done();
      assertEquals(location, "https://drash.land/");
    },
  );
}
