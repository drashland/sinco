import { ChromeClient, FirefoxClient } from "../../mod.ts";

Deno.test("Chrome: Clicking elements - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await ChromeClient.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.click('a[href="/features/schedule"]');
  await Sinco.waitForPageChange();
  await Sinco.assertUrlIs("https://chromestatus.com/features/schedule");
  await Sinco.done();
});

Deno.test("Firefox: Clicking elements - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await FirefoxClient.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.click('a[href="/features/schedule"]');
  await Sinco.waitForPageChange();
  await Sinco.assertUrlIs("https://chromestatus.com/features/schedule");
  await Sinco.done();
});
