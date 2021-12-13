import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";
import { assertEquals } from "../../deps.ts";

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name +
      ": Assertions - Tutorial for this feature in the docs should work",
    async () => {
      const Sinco = await buildFor(browserItem.name);
      const page = await Sinco.goTo("https://drash.land");
      assertEquals(await page.location(), "https://drash.land/");
      await page.assertSee("Develop With Confidence");
      await Sinco.done();
    },
  );
}
