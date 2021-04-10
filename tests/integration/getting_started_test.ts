import { assertEquals } from "../../deps.ts";
import { ChromeClient, FirefoxClient } from "../../mod.ts";

Deno.test("Chrome: Tutorial for Getting Started in the docs should work", async () => {
  // Setup
  const Sinco = await ChromeClient.build();
  await Sinco.goTo("https://chromestatus.com"); // Go to this page

  // Do any actions and assertions, in any order
  await Sinco.assertUrlIs("https://chromestatus.com/features");
  await Sinco.type('input[placeholder="Filter"]', "Hello");
  const value = await Sinco.getInputValue('input[placeholder="Filter"]');
  assertEquals(value, "Hello");
  await Sinco.click('a[href="/features/schedule"]');
  await Sinco.waitForPageChange();
  await Sinco.assertUrlIs("https://chromestatus.com/features/schedule");
  await Sinco.assertSee("Release timeline");

  // Once finished, close
  await Sinco.done();
});

Deno.test("Firefox: Tutorial for Getting Started in the docs should work", async () => {
  // Setup
  const Sinco = await FirefoxClient.build();
  await Sinco.goTo("https://chromestatus.com"); // Go to this page

  // Do any actions and assertions, in any order
  await Sinco.assertUrlIs("https://chromestatus.com/features");
  await Sinco.type('input[placeholder="Filter"]', "Hello");
  const value = await Sinco.getInputValue('input[placeholder="Filter"]');
  assertEquals(value, "Hello");
  await Sinco.click('a[href="/features/schedule"]');
  await Sinco.waitForPageChange();
  await Sinco.assertUrlIs("https://chromestatus.com/features/schedule");
  await Sinco.assertSee("Release timeline");

  // Once finished, close
  await Sinco.done();
});
