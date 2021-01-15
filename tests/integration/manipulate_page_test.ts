import { HeadlessBrowser } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";

Deno.test("Manipulate Webpage", async () => {
  const Sinco = new HeadlessBrowser();
  await Sinco.build();
  await Sinco.goTo("https://chromestatus.com");

  const updatedBody = await Sinco.evaluatePage(() => {
    // deno-lint-ignore no-undef
    const prevBody = document.body.children.length;
    // deno-lint-ignore no-undef
    const newEl = document.createElement("p");
    // deno-lint-ignore no-undef
    document.body.appendChild(newEl);
    // deno-lint-ignore no-undef
    return prevBody === document.body.children.length - 1;
  });
  assertEquals(updatedBody, true);

  await Sinco.done();
});
