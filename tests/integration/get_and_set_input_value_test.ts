import { HeadlessBrowser } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";

Deno.test("My web app works as expected", async () => {
  const Sinco = new HeadlessBrowser();
  await Sinco.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.type('input[placeholder="Filter"]', "hello world");
  const val = await Sinco.getInputValue('input[placeholder="Filter"]');
  assertEquals(val, "hello world");
  await Sinco.done();
})