import { HeadlessBrowser } from "../../mod.ts";

Deno.test("Visit pages - Tutorial for this feature in the docs should work", async () => {
  const Sinco = new HeadlessBrowser();
  await Sinco.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.assertUrlIs("https://chromestatus.com/features");
  await Sinco.done();
});
