import { browserList } from "../browser_list.ts";
const ScreenshotsFolder = "./tests/unit/Screenshots";
import { buildFor } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";
import { existsSync } from "../../src/utility.ts";
import { server } from "../server.ts";

for (const browserItem of browserList) {
  Deno.test(browserItem.name, async (t) => {
    await t.step("takeScreenshot()", async (t) => {
      await t.step(
        "takeScreenshot() | Throws an error if provided path doesn't exist",
        async () => {
          let msg = "";
          const { page } = await buildFor(browserItem.name);
          await page.location("https://drash.land");
          try {
            await page.takeScreenshot("eieio");
          } catch (error) {
            msg = error.message;
          }

          assertEquals(
            msg,
            `The provided folder path "eieio" doesn't exist`,
          );
        },
      );

      await t.step(
        "takeScreenshot() | Takes a Screenshot with timestamp as filename if filename is not provided",
        async () => {
          const { browser, page } = await buildFor(browserItem.name);
          await page.location("https://drash.land");
          const fileName = await page.takeScreenshot(ScreenshotsFolder);
          await browser.close();
          const exists = existsSync(fileName);
          Deno.removeSync(fileName);
          assertEquals(
            exists,
            true,
          );
        },
      );

      await t.step(
        "Throws an error when format passed is jpeg(or default) and quality > than 100",
        async () => {
          const { page } = await buildFor(browserItem.name);
          await page.location("https://drash.land");
          let msg = "";
          try {
            await page.takeScreenshot(ScreenshotsFolder, { quality: 999 });
          } catch (error) {
            msg = error.message;
          }
          //await browser.close();
          assertEquals(
            msg,
            "A quality value greater than 100 is not allowed.",
          );
        },
      );

      await t.step("Saves Screenshot with Given Filename", async () => {
        const { browser, page } = await buildFor(browserItem.name);
        await page.location("https://drash.land");
        const filename = await page.takeScreenshot(ScreenshotsFolder, {
          fileName: "Happy",
        });
        await browser.close();
        const exists = existsSync(filename);
        Deno.removeSync(filename);
        assertEquals(
          exists,
          true,
        );
      });

      await t.step(
        "Saves Screenshot with given format (jpeg | png)",
        async () => {
          const { browser, page } = await buildFor(browserItem.name);
          await page.location("https://drash.land");
          const fileName = await page.takeScreenshot(ScreenshotsFolder, {
            format: "png",
          });
          await browser.close();
          const exists = existsSync(fileName);
          assertEquals(
            exists,
            true,
          );
          Deno.removeSync(fileName);
        },
      );
    });

    await t.step("evaluate()", async (t) => {
      await t.step(
        "It should evaluate function on current frame",
        async () => {
          const { browser, page } = await buildFor(browserItem.name);
          await page.location("https://drash.land");
          const pageTitle = await page.evaluate(() => {
            // deno-lint-ignore no-undef
            return document.title;
          });
          await browser.close();
          assertEquals(pageTitle, "Drash Land");
        },
      );
      await t.step("It should evaluate string on current frame", async () => {
        const { browser, page } = await buildFor(browserItem.name);
        await page.location("https://drash.land");
        const parentConstructor = await page.evaluate(`1 + 2`);
        await browser.close();
        assertEquals(parentConstructor, 3);
      });
    });

    await t.step("location()", async (t) => {
      await t.step("Sets and gets the location", async () => {
        const { browser, page } = await buildFor(browserItem.name);
        await page.location("https://google.com");
        await page.location("https://drash.land");
        const location = await page.location();
        await browser.close();
        assertEquals(location, "https://drash.land/");
      });
    });

    await t.step("cookie()", async (t) => {
      await t.step("Sets and gets cookies", async () => {
        const { browser, page } = await buildFor(browserItem.name);
        await page.location("https://drash.land");
        await page.cookie({
          name: "user",
          value: "ed",
          "url": "https://drash.land",
        });
        const cookies = await page.cookie();
        await browser.close();
        assertEquals(cookies, browserItem.cookies);
      });
    });

    await t.step("assertNoConsoleErrors()", async (t) => {
      await t.step(`Should throw when errors`, async () => {
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
        await browser.close();
        await server.close();
        assertEquals(
          errMsg.startsWith(
            `Expected console to show no errors. Instead got:\n`,
          ),
          true,
        );
        assertEquals(errMsg.includes("Not Found"), true);
        assertEquals(errMsg.includes("callUser"), true);
      });

      await t.step(`Should not throw when no errors`, async () => {
        const { browser, page } = await buildFor(browserItem.name);
        await page.location(
          "https://drash.land",
        );
        await page.assertNoConsoleErrors();
        await browser.close();
      });

      await t.step(` Should exclude messages`, async () => {
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
        await browser.close();
        assertEquals(
          errMsg.startsWith("Expected console to show no errors. Instead got"),
          true,
        );
        assertEquals(errMsg.includes("Not Found"), true);
        assertEquals(errMsg.includes("callUser"), false);
      });
    });

    await t.step("close()", async (t) => {
      await t.step(`Closes the page`, async () => {
        const { browser, page } = await buildFor(browserItem.name);
        await page.location("https://drash.land");
        await page.close();
        let errMsg = "";
        try {
          await page.location();
        } catch (e) {
          errMsg = e.message;
        }
        await browser.close();
        assertEquals(errMsg, "readyState not OPEN");
        try {
          await browser.page(1);
          assertEquals(true, false);
        } catch (_e) {
          // do nothing, error should be thrown
        }
        assertEquals(page.socket.readyState, page.socket.CLOSED);
      });
    });

    await t.step("wait()", async (t) => {
      await t.step(`Waits correctly`, async () => {
        const { browser, page } = await buildFor(browserItem.name);
        server.run();
        await page.location(server.address + "/long-running-js");
        const result = await page.wait(`document.readyState === "complete"`);
        await browser.close();
        await server.close();
        assertEquals(result, true);
      });
      await t.step(`Returns false if it took to long`, async () => {
        const { browser, page } = await buildFor(browserItem.name);
        server.run();
        await page.location(server.address + "/long-running-js");
        const result = await page.wait(`document.readyState === "nothing"`);
        await browser.close();
        await server.close();
        assertEquals(result, false);
      });
    });
  });
}
