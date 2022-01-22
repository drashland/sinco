import { buildFor } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";
import { browserList } from "../browser_list.ts";
const ScreenshotsFolder = "./Screenshots";
import { existsSync } from "../../src/utility.ts";

for (const browserItem of browserList) {
  Deno.test("click() | It should allow clicking of elements and update location", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://drash.land");
    const elem = await page.querySelector(
      'a[href="https://discord.gg/RFsCSaHRWK"]',
    );
    await elem.click({}, true);
    const page1Location = await page.location();
    await browser.close();
    assertEquals(page1Location, "https://discord.com/invite/RFsCSaHRWK");
  });

  Deno.test(`[${browserItem.name}] click() | Should open a new page when middle clicked`, async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://drash.land");
    const elem = await page.querySelector("a");
    if (browserItem.name === "firefox") {
      let errMsg = "";
      try {
        await elem.click({
          button: "middle",
        });
      } catch (e) {
        errMsg = e.message;
      }
      assertEquals(
        errMsg,
        "Middle clicking in firefox doesn't work at the moment. Please mention on our Discord if you would like to discuss it.",
      );
      return;
    }
    await elem.click({
      button: "middle",
    });
    const page1Location = await page.location();
    const page2 = await browser.page(2);
    const page2location = await page2.location();
    await browser.close();
    assertEquals(page1Location, "https://drash.land/");
    assertEquals(page2location, "https://github.com/drashland");
  });

  Deno.test(
    "takeScreenshot() | Takes Screenshot of only the element passed as selector and also quality(only if the image is jpeg)",
    async () => {
      try {
        Deno.removeSync(ScreenshotsFolder, {
          recursive: true,
        });
      } catch (_e) {
        // if doesnt exist, no problamo
      }
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://chromestatus.com");
      const span = await page.querySelector("span");
      Deno.mkdirSync(ScreenshotsFolder);
      const fileName = await span.takeScreenshot(ScreenshotsFolder, {
        quality: 50,
      });
      await browser.close();
      const exists = existsSync(fileName);
      Deno.removeSync(ScreenshotsFolder, {
        recursive: true,
      });
      assertEquals(
        exists,
        true,
      );
    },
  );

  Deno.test("takeScreenshot() | Saves Screenshot with all options provided", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://chromestatus.com");
    const span = await page.querySelector("span");
    Deno.mkdirSync(ScreenshotsFolder);
    const filename = await span.takeScreenshot(ScreenshotsFolder, {
      fileName: "AllOpts",
      format: "jpeg",
      quality: 100,
    });
    await browser.close();
    const exists = existsSync(filename);
    Deno.removeSync(ScreenshotsFolder, {
      recursive: true,
    });
    assertEquals(
      exists,
      true,
    );
  });

  Deno.test("value | It should get the value for the given input element", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://chromestatus.com");
    const elem = await page.querySelector('input[placeholder="Filter"]');
    await elem.value("hello world");
    const val = await elem.value();
    assertEquals(val, "hello world");
    await browser.close();
  });
  Deno.test(
    "value | Should return empty when element is not an input element",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://chromestatus.com");
      let errMsg = "";
      const elem = await page.querySelector("div");
      try {
        await elem.value;
      } catch (e) {
        errMsg = e.message;
      }
      await browser.close();
      assertEquals(
        errMsg,
        "",
      );
    },
  );

  Deno.test("value() | It should set the value of the element", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://chromestatus.com");
    const elem = await page.querySelector('input[placeholder="Filter"]');
    await elem.value("hello world");
    const val = await elem.value();
    await browser.close();
    assertEquals(val, "hello world");
  });
}
