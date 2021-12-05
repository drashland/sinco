import { assertEquals } from "../../deps.ts";
import { buildFor } from "../../mod.ts";

import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  Deno.test(browserItem.name + ": Manipulate Webpage", async () => {
    const Sinco = await buildFor(browserItem.name);
    await Sinco.location("https://drash.land");

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

  Deno.test(
    browserItem.name +
      ": Evaluating a script - Tutorial for this feature in the documentation works",
    async () => {
      const Sinco = await buildFor(browserItem.name);
      await Sinco.location("https://drash.land");
      const pageTitle = await Sinco.evaluatePage(() => {
        // deno-lint-ignore no-undef
        return document.title;
      });
      const sum = await Sinco.evaluatePage(`1 + 10`);
      const oldBodyLength = await Sinco.evaluatePage(() => {
        // deno-lint-ignore no-undef
        return document.body.children.length;
      });
      const newBodyLength = await Sinco.evaluatePage(() => {
        // deno-lint-ignore no-undef
        const p = document.createElement("p");
        p.textContent = "Hello world!";
        // deno-lint-ignore no-undef
        document.body.appendChild(p);
        // deno-lint-ignore no-undef
        return document.body.children.length;
      });
      await Sinco.done();
      assertEquals(pageTitle, "Drash Land");
      assertEquals(sum, 11);
      assertEquals(oldBodyLength, 3);
      assertEquals(newBodyLength, 4);
    },
  );
}
