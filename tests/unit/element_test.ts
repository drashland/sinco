import { buildFor } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";
import { browserList } from "../browser_list.ts";
const ScreenshotsFolder = "./Screenshots";
import { existsSync } from "../../src/utility.ts";
import { server } from "../server.ts";
import { resolve } from "../deps.ts";
const remote = Deno.args.includes("--remoteBrowser");
const serverAdd = `http://${
  (remote) ? "host.docker.internal" : "localhost"
}:1447`;
for (const browserItem of browserList) {
  Deno.test(browserItem.name, async (t) => {
    await t.step("click()", async (t) => {
      await t.step(
        "It should fail if the element is no longer present in the DOM",
        async () => {
          const { page } = await buildFor(browserItem.name, {
            remote,
          });
          await page.location("https://drash.land");
          // Need to make the element either not clickable or not a HTMLElement
          const selector = 'a[href="https://discord.gg/RFsCSaHRWK"]';
          const elem = await page.querySelector(
            selector,
          );
          await page.location("https://google.com");
          let errMsg = "";
          try {
            await elem.click();
          } catch (e) {
            errMsg = e.message;
          }
          assertEquals(
            errMsg,
            `The given element ("${selector}") is no longer present in the DOM`,
          );
        },
      );

      await t.step(
        "It should allow clicking of elements and update location",
        async () => {
          const { browser, page } = await buildFor(browserItem.name, {
            remote,
          });
          await page.location("https://drash.land");
          const elem = await page.querySelector(
            'a[href="https://discord.gg/RFsCSaHRWK"]',
          );
          await elem.click({
            waitFor: "navigation",
          });
          const page1Location = await page.location();
          await browser.close();
          assertEquals(page1Location, "https://discord.com/invite/RFsCSaHRWK");
        },
      );

      await t.step(`Should open a new page when middle clicked`, async () => {
        const { browser, page } = await buildFor(browserItem.name, { remote });
        await page.location("https://drash.land");
        const elem = await page.querySelector("a");
        // if (browserItem.name === "firefox") {
        //   let errMsg = "";
        //   try {
        //     await elem.click({
        //       button: "middle",
        //     });
        //   } catch (e) {
        //     errMsg = e.message;
        //   }
        //   assertEquals(
        //     errMsg,
        //     "Middle clicking in firefox doesn't work at the moment. Please mention on our Discord if you would like to discuss it.",
        //   );
        //   return;
        // }
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
    });

    await t.step("takeScreenshot()", async (t) => {
      await t.step(
        "Takes Screenshot of only the element passed as selector and also quality(only if the image is jpeg)",
        async () => {
          try {
            Deno.removeSync(ScreenshotsFolder, {
              recursive: true,
            });
          } catch (_e) {
            // if doesnt exist, no problamo
          }

          const { browser, page } = await buildFor(browserItem.name, {
            remote,
          });
          await page.location("https://drash.land");
          const img = await page.querySelector("img");
          Deno.mkdirSync(ScreenshotsFolder);
          const fileName = await img.takeScreenshot(ScreenshotsFolder, {
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

      await t.step("Saves Screenshot with all options provided", async () => {
        const { browser, page } = await buildFor(browserItem.name, { remote });
        await page.location("https://chromestatus.com");
        const h3 = await page.querySelector("h3");
        Deno.mkdirSync(ScreenshotsFolder);
        const filename = await h3.takeScreenshot(ScreenshotsFolder, {
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
    });

    await t.step("value", async (t) => {
      await t.step(
        "It should get the value for the given input element",
        async () => {
          const { browser, page } = await buildFor(browserItem.name, {
            remote,
          });
          await page.location("https://chromestatus.com");
          const elem = await page.querySelector(
            'input[placeholder="Filter"]',
          );
          await elem.value("hello world");
          const val = await elem.value();
          assertEquals(val, "hello world");
          await browser.close();
        },
      );
      await t.step(
        "Should return empty when element is not an input element",
        async () => {
          const { browser, page } = await buildFor(browserItem.name, {
            remote,
          });
          await page.location("https://chromestatus.com");
          let errMsg = "";
          const elem = await page.querySelector("div");
          try {
            await elem.value();
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
    });

    await t.step("value()", async (t) => {
      await t.step("It should set the value of the element", async () => {
        const { browser, page } = await buildFor(browserItem.name, { remote });
        await page.location("https://chromestatus.com");
        const elem = await page.querySelector('input[placeholder="Filter"]');
        await elem.value("hello world");
        const val = await elem.value();
        await browser.close();
        assertEquals(val, "hello world");
      });
    });

    await t.step({
      name: "files()",
      fn: async (t) => {
        await t.step(
          "Should throw if multiple files and input isnt multiple",
          async () => {
            server.run();
            const { browser, page } = await buildFor(browserItem.name, {
              remote,
            });
            await page.location(serverAdd + "/file-input");
            const elem = await page.querySelector("#single-file");
            let errMsg = "";
            try {
              await elem.files("ffff", "hhh");
            } catch (e) {
              errMsg = e.message;
            } finally {
              await server.close();
              await browser.close();
            }
            assertEquals(
              errMsg,
              `Trying to set files on a file input without the 'multiple' attribute`,
            );
          },
        );
        await t.step("Should throw if element isnt an input", async () => {
          server.run();
          const { browser, page } = await buildFor(browserItem.name, {
            remote,
          });
          await page.location(serverAdd + "/file-input");
          const elem = await page.querySelector("p");
          let errMsg = "";
          try {
            await elem.files("ffff");
          } catch (e) {
            errMsg = e.message;
          } finally {
            await server.close();
            await browser.close();
          }
          assertEquals(
            errMsg,
            "Trying to set a file on an element that isnt an input",
          );
        });
        await t.step("Should throw if input is not of type file", async () => {
          server.run();
          const { browser, page } = await buildFor(browserItem.name, {
            remote,
          });
          await page.location(serverAdd + "/file-input");
          const elem = await page.querySelector("#text");
          let errMsg = "";
          try {
            await elem.files("ffff");
          } catch (e) {
            errMsg = e.message;
          } finally {
            await server.close();
            await browser.close();
          }
          assertEquals(
            errMsg,
            'Trying to set a file on an input that is not of type "file"',
          );
        });
        await t.step("Should successfully upload files", async () => {
          server.run();
          const { browser, page } = await buildFor(browserItem.name, {
            remote,
          });
          await page.location(serverAdd + "/file-input");
          const elem = await page.querySelector("#multiple-file");
          try {
            await elem.files(
              resolve("./README.md"),
              resolve("./tsconfig.json"),
            );
            const files = JSON.parse(
              await page.evaluate(
                `JSON.stringify(document.querySelector('#multiple-file').files)`,
              ),
            );
            assertEquals(Object.keys(files).length, 2);
          } finally {
            await server.close();
            await browser.close();
          }
        });
      },
    }); //Ignoring until we figure out a way to run the server on a remote container accesible to the remote browser

    await t.step({
      name: "file()",
      fn: async (t) => {
        await t.step("Should throw if element isnt an input", async () => {
          server.run();
          const { browser, page } = await buildFor(browserItem.name, {
            remote,
          });
          await page.location(serverAdd + "/file-input");
          const elem = await page.querySelector("p");
          let errMsg = "";
          try {
            await elem.file("ffff");
          } catch (e) {
            errMsg = e.message;
          } finally {
            await server.close();
            await browser.close();
          }
          assertEquals(
            errMsg,
            "Trying to set a file on an element that isnt an input",
          );
        });
        await t.step("Should throw if input is not of type file", async () => {
          server.run();
          const { browser, page } = await buildFor(browserItem.name, {
            remote,
          });
          await page.location(serverAdd + "/file-input");
          const elem = await page.querySelector("#text");
          let errMsg = "";
          try {
            await elem.file("ffff");
          } catch (e) {
            errMsg = e.message;
          } finally {
            await server.close();
            await browser.close();
          }
          assertEquals(
            errMsg,
            'Trying to set a file on an input that is not of type "file"',
          );
        });
        await t.step("Should successfully upload files", async () => {
          server.run();
          const { browser, page } = await buildFor(browserItem.name, {
            remote,
          });
          await page.location(serverAdd + "/file-input");
          const elem = await page.querySelector("#single-file");
          try {
            await elem.file(resolve("./README.md"));
            const files = JSON.parse(
              await page.evaluate(
                `JSON.stringify(document.querySelector('#single-file').files)`,
              ),
            );
            assertEquals(Object.keys(files).length, 1);
          } finally {
            await server.close();
            await browser.close();
          }
        });
      },
    }); //Ignoring until we figure out a way to run the server on a remote container accesible to the remote browser

    await t.step("getAttribute()", async (t) => {
      await t.step("Should get the attribute", async () => {
        const { browser, page } = await buildFor(browserItem.name, { remote });
        await page.location("https://drash.land");
        const elem = await page.querySelector("a");
        const val = await elem.getAttribute("href");
        await browser.close();
        assertEquals(val, "https://github.com/drashland");
      });
    });

    await t.step("setAttribute()", async (t) => {
      await t.step("Should set the attribute", async () => {
        const { browser, page } = await buildFor(browserItem.name, { remote });
        await page.location("https://drash.land");
        const elem = await page.querySelector("a");
        elem.setAttribute("data-name", "Sinco");
        const val = await page.evaluate(() => {
          return document.querySelector("a")?.getAttribute("data-name");
        });
        await browser.close();
        assertEquals(val, "Sinco");
      });
    });
  });
}
