import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";
import { assertEquals } from "../../deps.ts";

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name +
      ": Clicking elements - Tutorial for this feature in the docs should work",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      // Clicking an element that will open up a new page (tab)
      await page.location("https://drash.land");
      const elem = await page.querySelector(
        'a[href="https://discord.gg/RFsCSaHRWK"]',
      );
      await elem.click({
        button: "middle" // Say for example an anchor tag uses _BLANK, use "middle" here
      });
      const location = await page.location()
      console.log(location)
      const page2 = browser.pages[1]
      const page2Location = await page2.location()
      //await browser.close();
      assertEquals(
        page2Location,
        "https://discord.com/invite/RFsCSaHRWK",
      );

      // Clicking elements that change the page location
      // await page.location("https://deno.land")
      // const xElem = await page.querySelector('a[href="/x"]')
      // await xElem.click({}, true);
      // const pageLocation = await page.location()

      await browser.close()
      // assertEquals(pageLocation, "https://deno.land/x")
    },
  );
  break
}
