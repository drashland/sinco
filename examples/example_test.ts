import { Dawn } from "../mod.ts";

/**
 * deno test -A examples/example_test.ts
 */

Deno.test("I will pass", async () => {
  // Initialise dawn
  const dawn = new Dawn("https://chromestatus.com");

  // Do stuff
  await dawn.assertUrlIs("https://chromestatus.com/features");
  // ...

  // Finish
  await dawn.done();
});

Deno.test("I will fail", async () => {
  // Initialise dawn
  const dawn = new Dawn("https://chromestatus.com");

  // Do stuff
  await dawn.assertUrlIs("https://chromestatus.com/feeaatureesss");
  // ...

  // Finish
  await dawn.done();
});
