import { buildFor } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";
import { delay } from "https://deno.land/std/async/delay.ts";

Deno.test(
  "[chrome] Clicking elements - Tutorial for this feature in the docs should work",
  async () => {
    const { browser, page } = await buildFor("chrome");
    // Clicking an element that will open up a new page (tab)
    await page.location("https://drash.land");
    const githubElem = await page.querySelector(
      "a",
    );
    await githubElem.click({
      button: "middle", // Make sure when clicking an element that will open a new page, "middle" is used
    });
    await delay(1000);
    const page2 = await browser.page(2);
    const page2Location = await page2.location();

    // Click an element that will change a pages location
    const discordElem = await page.querySelector(
      'a[href="https://discord.gg/RFsCSaHRWK"]',
    );
    await discordElem.click({
      waitFor: "navigation",
    });
    const page1Location = await page.location();

    await browser.close();

    assertEquals(
      page2Location,
      "https://github.com/drashland",
    );
    assertEquals(page1Location, "https://discord.com/invite/RFsCSaHRWK");
    console.log('finished')
  },
);

Deno.test(
  "[firefox] Clicking elements - Tutorial for this feature in the docs should work",
  async () => {
    console.log('building')
    const { browser, page } = await buildFor("firefox");
    // Clicking an element that will open up a new page (tab)
    console.log('changing location')
    await page.location("https://drash.land");

    // Click an element that will change a pages location
    console.log('cliocking discord link')
    const discordElem = await page.querySelector(
      'a[href="https://discord.gg/RFsCSaHRWK"]',
    );
    await discordElem.click({
      waitFor: "navigation",
    });
    console.log('getting loc')
    const page1Location = await page.location();

    console.log('closing')
    await browser.close();

    console.log('asserting', page1Location)
    assertEquals(page1Location, "https://discord.com/invite/RFsCSaHRWK");
  },
);
