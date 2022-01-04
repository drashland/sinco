import { buildFor } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";

Deno.test(
  "[chrome] Clicking elements - Tutorial for this feature in the docs should work",
  async () => {
    console.log('gonna build')
    const { browser, page } = await buildFor("chrome");
    console.log('built')
    // Clicking an element that will open up a new page (tab)
    await page.location("https://drash.land");
    const githubElem = await page.querySelector(
      "a",
    );
    console.log('gonna click')
    await githubElem.click({
      button: "middle", // Make sure when clicking an element that will open a new page, "middle" is used
    });
    console.log('clicked')
    const page2 = browser.pages[1];
    const page2Location = await page2.location();
    console.log('got loc')

    // Click an element that will change a pages location
    const discordElem = await page.querySelector(
      'a[href="https://discord.gg/RFsCSaHRWK"]',
    );
    await discordElem.click({}, true);
    console.log('clicked discord linlk')
    const page1Location = await page.location();
    console.log('got loc')

    await browser.close();

    assertEquals(
      page2Location,
      "https://github.com/drashland",
    );
    assertEquals(page1Location, "https://discord.com/invite/RFsCSaHRWK");
  },
);

Deno.test(
  "[firefox] Clicking elements - Tutorial for this feature in the docs should work",
  async () => {
    const { browser, page } = await buildFor("firefox");
    // Clicking an element that will open up a new page (tab)
    await page.location("https://drash.land");

    // Click an element that will change a pages location
    const discordElem = await page.querySelector(
      'a[href="https://discord.gg/RFsCSaHRWK"]',
    );
    await discordElem.click({}, true);
    const page1Location = await page.location();

    await browser.close();

    assertEquals(page1Location, "https://discord.com/invite/RFsCSaHRWK");
  },
);
