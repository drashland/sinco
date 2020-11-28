import { HeadlessBrowser } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";

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
  const value = await Sinco.getInputValue('input[placeholder="Filter"]');
  assertEquals(value, "Hello");
  await Sinco.click('a[href="/features/schedule"]');
  await Sinco.waitForPageChange();
  await Sinco.assertUrlIs("https://chromestatus.com/features/schedule");
  await Sinco.assertSee("Release timeline");

  // Once finished, close
  await Sinco.done();
})