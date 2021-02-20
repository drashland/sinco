import {ChromeClient, FirefoxClient} from "../../mod.ts";

Deno.test("Chrome: Visit pages - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await ChromeClient.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.assertUrlIs("https://chromestatus.com/features");
  await Sinco.done();
});

Deno.test("Firfox: Visit pages - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await FirefoxClient.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.assertUrlIs("https://chromestatus.com/features");
  await Sinco.done();
});
