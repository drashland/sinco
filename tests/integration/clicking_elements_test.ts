import { FirefoxClient } from "../../src/firefox_client.ts";

const Sinco = await FirefoxClient.build();
await Sinco.goTo("https://drash.land");
// @ts-ignore
const a = await Sinco.evaluatePage(() => { return window.location})
console.log(a)
await Sinco.done()
//await Sinco.goTo("https://chromestatus.com");
//await Sinco.click('a[href="/features/schedule"]');
//await Sinco.waitForPageChange();
// @ts-ignore
// await Sinco.screenshotToDataURL()
// await Sinco.done()

// idea: get ws url from the first for await we use on sub process? applies to both firefox and chrome