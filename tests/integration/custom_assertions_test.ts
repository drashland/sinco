import {ChromeClient, FirefoxClient} from "../../mod.ts";

Deno.test("Chrome: Assertions - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await ChromeClient.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.assertUrlIs("https://chromestatus.com/features");
  await Sinco.assertSee("Chrome versions");
  await Sinco.done();
});

Deno.test("Firefox: Assertions - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await FirefoxClient.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.assertUrlIs("https://chromestatus.com/features");
  await Sinco.assertSee("Chrome versions");
  await Sinco.done();
});
