import { HeadlessBrowser } from "../../mod.ts";

Deno.test("My web app works as expected", async () => {
  const Sinco = new HeadlessBrowser();
  await Sinco.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.assertUrlIs("https://chromestatus.com/features");
  await Sinco.assertSee("Chrome versions");
  await Sinco.done();
});
