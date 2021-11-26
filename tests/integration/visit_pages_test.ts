import { buildFor } from "../../mod.ts";

Deno.test("Chrome: Visit pages - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await buildFor("chrome");
  await Sinco.goTo("https://drash.land");
  await Sinco.assertUrlIs("https://drash.land/");
  await Sinco.done();
});

Deno.test("Firfox: Visit pages - Tutorial for this feature in the docs should work", async () => {
  const Sinco = await buildFor("firefox");
  await Sinco.goTo("https://drash.land");
  await Sinco.assertUrlIs("https://drash.land/");
  await Sinco.done();
});
