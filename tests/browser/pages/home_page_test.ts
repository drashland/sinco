import { HeadlessBrowser } from "../../../mod.ts";
import { assertEquals } from "https://deno.land/std@0.78.0/testing/asserts.ts";

Deno.test("My test", async () => {
  // Setup
  const Sinco = new HeadlessBrowser();
  await Sinco.build(); // Creates the headless browser
  await Sinco.goTo("https://chromestatus.com"); // Go to this page
  // Do any actions and assertions, in any order
  await Sinco.assertUrlIs("https://chromestatus.com/features");
  await Sinco.type('input[placeholder="Filter"]', "Hello");
  await Sinco.waitForAnchorChange();
  await Sinco.assertUrlIs("https://chromestatus.com/features#Hello");
  await Sinco.type('a[href="/features"]', "yamum");
  await Sinco.goTo("https://google.com")
  await Sinco.done();
});