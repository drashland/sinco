import { buildFor } from "../../mod.ts";

Deno.test("Chrome: Clicking elements - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await buildFor("chrome");
  await Sinco.goTo("https://drash.land");
  await Sinco.click('a[href="https://discord.gg/RFsCSaHRWK"]');
  await Sinco.waitForPageChange();
  await Sinco.assertUrlIs("https://discord.com/invite/RFsCSaHRWK");
  await Sinco.done();
});

Deno.test("Firefox: Clicking elements - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await buildFor("firefox");
  await Sinco.goTo("https://drash.land");
  await Sinco.click('a[href="https://discord.gg/RFsCSaHRWK"]');
  await Sinco.waitForPageChange();
  await Sinco.assertUrlIs("https://discord.com/invite/RFsCSaHRWK");
  await Sinco.done();
});
