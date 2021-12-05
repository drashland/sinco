import { assertEquals } from "../../deps.ts";
import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name +
      ": Get and set input value - Tutorial for this feature in the docs should work",
    async () => {
      const Sinco = await buildFor(browserItem.name);
      await Sinco.location("https://chromestatus.com");
      const elem = await Sinco.querySelector('input[placeholder="Filter"]');
      elem.value = "hello world";
      const val = await elem.value;
      assertEquals(val, "hello world");
      await Sinco.done();
    },
  );
}
