import { browserList } from "../browser_list.ts";
const ScreenshotsFolder = "./tests/unit/Screenshots";
import { buildFor } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";
import { existsSync } from "../../src/utility.ts";
import { server } from "../server.ts";

for (const browserItem of browserList) {
  Deno.test(
    "takeScreenshot() | Throws an error if provided path doesn't exist",
    async () => {
      let msg = "";
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://chromestatus.com");
      try {
        await page.takeScreenshot("eieio");
      } catch (error) {
        msg = error.message;
      }

      assertEquals(
        msg,
        `The provided folder path - eieio doesn't exist`,
      );
    },
  );

  Deno.test(
    "takeScreenshot() | Takes a Screenshot with timestamp as filename if filename is not provided",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://chromestatus.com");
      const fileName = await page.takeScreenshot(ScreenshotsFolder);
      await browser.done();
      const exists = existsSync(fileName);
      Deno.removeSync(fileName);
      assertEquals(
        exists,
        true,
      );
    },
  );

  Deno.test(
    "takeScreenshot() | Takes Screenshot of only the element passed as selector and also quality(only if the image is jpeg)",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://chromestatus.com");
      const fileName = await page.takeScreenshot(ScreenshotsFolder, {
        selector: "span",
        quality: 50,
      });
      await browser.done();
      const exists = existsSync(fileName);
      Deno.removeSync(fileName);
      assertEquals(
        exists,
        true,
      );
    },
  );

  Deno.test(
    "Throws an error when format passed is jpeg(or default) and quality > than 100",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://chromestatus.com");
      let msg = "";
      try {
        await page.takeScreenshot(ScreenshotsFolder, { quality: 999 });
      } catch (error) {
        msg = error.message;
      }
      //await browser.done();
      assertEquals(
        msg,
        "A quality value greater than 100 is not allowed.",
      );
    },
  );

  Deno.test("Saves Screenshot with Given Filename", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://chromestatus.com");
    const filename = await page.takeScreenshot(ScreenshotsFolder, {
      fileName: "Happy",
    });
    await browser.done();
    const exists = existsSync(filename);
    Deno.removeSync(filename);
    assertEquals(
      exists,
      true,
    );
  });

  Deno.test(
    "takeScreenshot() | Saves Screenshot with given format (jpeg | png)",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://chromestatus.com");
      const fileName = await page.takeScreenshot(ScreenshotsFolder, {
        format: "png",
      });
      await browser.done();
      const exists = existsSync(fileName);
      assertEquals(
        exists,
        true,
      );
      Deno.removeSync(fileName);
    },
  );

  Deno.test("takeScreenshot() | Saves Screenshot with all options provided", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://chromestatus.com");
    const filename = await page.takeScreenshot(ScreenshotsFolder, {
      fileName: "AllOpts",
      selector: "span",
      format: "jpeg",
      quality: 100,
    });
    await browser.done();
    const exists = existsSync(filename);
    assertEquals(
      exists,
      true,
    );
    Deno.removeSync(filename);
  });

  Deno.test("click() | It should allow clicking of elements", async () => {
  });

  Deno.test(
    "waitForPageChange() | Waits for a page to change before continuing",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://chromestatus.com");
      assertEquals(
        await page.location(),
        "https://chromestatus.com/features",
      );
      const elem = await page.querySelector('a[href="/roadmap"]');
      await elem.click();
      await page.waitForPageChange();
      assertEquals(await page.location(), "https://chromestatus.com/roadmap");
      await browser.done();
    },
  );

  Deno.test(
    "assertSee() | Assertion should work when text is present on page",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://chromestatus.com/features");
      await page.assertSee("Chrome Platform Status");
      await browser.done();
    },
  );
  Deno.test(
    "assertSee() | Assertion should NOT work when text is NOT present on page",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://chromestatus.com");
      let errorMsg = "";
      // test fails because page is its own instance, so page prop is true, but clients is still false
      try {
        await page.assertSee("Crumpets and tea init?");
      } catch (err) {
        errorMsg = err.message;
      }
      await browser.done();
      const msgArr = errorMsg.split("\n").filter((line) => {
        return !!line === true && line.indexOf(" ") !== 0 &&
          line.indexOf("Values") < 0;
      });
      assertEquals(msgArr[0].indexOf("-   false") > -1, true);
      assertEquals(msgArr[1].indexOf("+   true") > -1, true);
    },
  );

  Deno.test(
    "evaluate() | It should evaluate function on current frame",
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      await page.location("https://drash.land");
      const pageTitle = await page.evaluate(() => {
        // deno-lint-ignore no-undef
        return document.title;
      });
      await browser.done();
      assertEquals(pageTitle, "Drash Land");
    },
  );
  Deno.test("evaluate() | It should evaluate string on current frame", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://chromestatus.com");
    const parentConstructor = await page.evaluate(`1 + 2`);
    await browser.done();
    assertEquals(parentConstructor, 3);
  });

  Deno.test("location() | Sets and gets the location", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://google.com");
    await page.location("https://drash.land");
    const location = await page.location();
    await browser.done();
    assertEquals(location, "https://drash.land/");
  });

  Deno.test("cookie() | Sets and gets cookies", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://drash.land");
    await page.cookie({
      name: "user",
      value: "ed",
      "url": "https://drash.land",
    });
    const cookies = await page.cookie();
    await browser.done();
    assertEquals(cookies, browserItem.cookies);
  });

  Deno.test(`[${browserItem.name}] assertNoConsoleErrors() | Should throw when errors`, async () => {
    server.run();
    const { browser, page } = await buildFor(browserItem.name);
    // I (ed) knows this page shows errors, but if we ever need to change it in the future,
    // can always spin up a drash web app and add errors in the js to produce console errors
    await page.location(
      server.address,
    );
    let errMsg = "";
    try {
      await page.assertNoConsoleErrors();
    } catch (e) {
      errMsg = e.message;
    }
    await browser.done();
    await server.close();
    try {
      assertEquals(
        errMsg,
        `Expected console to show no errors. Instead got:
ReferenceError: callUser is not defined
    at http://localhost:1447/index.js:1:1
Failed to load resource: the server responded with a status of 404 (Not Found)`,
      );
    } catch (_e) {
      assertEquals(
        errMsg,
        `Expected console to show no errors. Instead got:
Failed to load resource: the server responded with a status of 404 (Not Found)
ReferenceError: callUser is not defined
    at http://localhost:1447/index.js:1:1
Failed to load resource: the server responded with a status of 404 (Not Found)`,
      );
    }
  });

  Deno.test(`[${browserItem.name}] assertNoConsoleErrors() | Should not throw when no errors`, async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location(
      "https://drash.land",
    );
    await page.assertNoConsoleErrors();
    await browser.done();
  });

  Deno.test(`[${browserItem.name}] assertNoConsoleErrors() | Should exclude messages`, async () => {
    server.run();
    const { browser, page } = await buildFor(browserItem.name);
    await page.location(
      server.address,
    );
    let errMsg = "";
    try {
      await page.assertNoConsoleErrors(["callUser"]);
    } catch (e) {
      errMsg = e.message;
    }
    await server.close();
    await browser.done();
    try {
      assertEquals(
        errMsg,
        `Expected console to show no errors. Instead got:
Failed to load resource: the server responded with a status of 404 (Not Found)
Failed to load resource: the server responded with a status of 404 (Not Found)`,
      );
    } catch (_e) {
      assertEquals(
        errMsg,
        `Expected console to show no errors. Instead got:
Failed to load resource: the server responded with a status of 404 (Not Found)`,
      );
    }
  });
  break;
}
