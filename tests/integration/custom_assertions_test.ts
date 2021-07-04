import { ChromeClient, FirefoxClient } from "../../mod.ts";

Deno.test("Chrome: Assertions - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await ChromeClient.build();
  await Sinco.goTo("https://drash.land");
  await Sinco.assertUrlIs("https://drash.land/");
  await Sinco.assertSee("Develop With Confidence");
  await Sinco.done();
});

Deno.test("Firefox: Assertions - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await FirefoxClient.build();
  await Sinco.goTo("https://drash.land");
  await Sinco.assertUrlIs("https://drash.land/");
  await Sinco.assertSee("Develop With Confidence");
  await Sinco.done();
});
