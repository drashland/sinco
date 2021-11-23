import { buildFor } from "../../mod.ts";

Deno.test("Chrome: Tutorial for Getting Started in the docs should work", async () => {
  // Setup
  const Sinco = await buildFor("chrome"); // also supports firefox
  await Sinco.goTo("https://drash.land"); // Go to this page

  // Do any actions and assertions, in any order
  await Sinco.assertUrlIs("https://drash.land/");
  await Sinco.click('a[href="https://discord.gg/RFsCSaHRWK"]'); // This element will take the user to Sinco's documentation
  await Sinco.waitForPageChange();
  await Sinco.assertUrlIs("https://discord.com/invite/RFsCSaHRWK");

  // Once finished, close to clean up any processes
  await Sinco.done();
});

Deno.test("Firefox: Tutorial for Getting Started in the docs should work", async () => {
  // Setup
  const Sinco = await buildFor("firefox"); // also supports firefox
  await Sinco.goTo("https://drash.land"); // Go to this page

  // Do any actions and assertions, in any order
  await Sinco.assertUrlIs("https://drash.land/");
  await Sinco.click('a[href="https://discord.gg/RFsCSaHRWK"]'); // This element will take the user to Sinco's documentation
  await Sinco.waitForPageChange();
  await Sinco.assertUrlIs("https://discord.com/invite/RFsCSaHRWK");

  // Once finished, close to clean up any processes
  await Sinco.done();
});
