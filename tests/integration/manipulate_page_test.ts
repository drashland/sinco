import { HeadlessBrowser } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";

Deno.test("Manipulate Webpage", async () => {
  const Sinco = new HeadlessBrowser();
  await Sinco.build();
  await Sinco.goTo("https://chromestatus.com");

  let updatedBody = await Sinco.evaluatePage(() => {
    const prevBody = document.body.children.length;
    const newEl = document.createElement("p");
    document.body.appendChild(newEl);
    return prevBody === document.body.children.length - 1;
  });
  assertEquals(updatedBody, true);

  await Sinco.done();
});
