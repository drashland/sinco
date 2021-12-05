import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name +
      ": Assertions - Tutorial for this feature in the docs should work",
    async () => {
      const Sinco = await buildFor(browserItem.name);
      await Sinco.location("https://drash.land");
      await Sinco.assertUrlIs("https://drash.land/");
      await Sinco.assertSee("Develop With Confidence");
      await Sinco.done();
    },
  );
}
