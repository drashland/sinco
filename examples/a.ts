import { ChromeClient } from "../mod.ts";

const Sinco = await ChromeClient.build();
await Sinco.goTo("https://drash.land");
//await Sinco.evaluatePage(`document.querySelector('a').getBoundingClientRect()`)
(await Sinco.evaluatePage(() => {
  return window.location.href;
}));
await Sinco.goTo("https://deno.land");
//await Sinco.evaluatePage(`document.querySelector('a').getBoundingClientRect()`)
console.log(
  await Sinco.evaluatePage(() => {
    return window.location.href;
  }),
);
await Sinco.done();
