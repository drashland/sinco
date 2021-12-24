import { buildFor } from "../../mod.ts";

import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name +
      " - Tutorial for taking screenshots in the docs should work",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://drash.land");
      const screenshotsFolder = "./screenshots";
      Deno.mkdirSync(screenshotsFolder); // Ensure you create the directory your screenshots will be put within
      await page.takeScreenshot(screenshotsFolder); // Will take a screenshot of the whole page, and write it to `./screenshots/dd_mm_yyyy_hh_mm_ss.jpeg`
      await page.takeScreenshot(screenshotsFolder, {
        fileName: "drash_land.png",
        format: "png",
      }); // Specify filename and format. Will be saved as `./screenshots/drash_land.png`
      await page.takeScreenshot(screenshotsFolder, {
        fileName: "modules.jpeg",
        selector: 'a[href="https://github.com/drashland"]',
      }); // Will screenshot only the GitHub icon section, and write it to `./screenshots/dd_mm_yyyy_hh_mm_ss.jpeg`
      await browser.close();
      Deno.removeSync("./screenshots", { recursive: true });
    },
  );
}
