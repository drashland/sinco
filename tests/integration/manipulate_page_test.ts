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

Deno.test("Evaluating a script - Tutorial for this feature in the documentation works", async () => {
  const Sinco = new HeadlessBrowser();
  await Sinco.build();
  await Sinco.goTo("https://chromestatus.com");
  const pageTitle = await Sinco.evaluatePage(() => {
    return document.title;
  });
  const sum = await Sinco.evaluatePage(`1 + 10`);
  const oldBodyLength = await Sinco.evaluatePage(() => {
    return document.body.children.length;
  });
  const newBodyLength = await Sinco.evaluatePage(() => {
    const p = document.createElement("p");
    p.textContent = "Hello world!";
    document.body.appendChild(p);
    return document.body.children.length;
  });
  await Sinco.done();
  assertEquals(pageTitle, "Chrome Platform Status");
  assertEquals(sum, 11);
  assertEquals(oldBodyLength, 7);
  assertEquals(newBodyLength, 8);
});
