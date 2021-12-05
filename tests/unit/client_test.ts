import { existsSync } from "./../../src/utility.ts";
import { Rhum } from "../deps.ts";
import { deferred } from "../../deps.ts";
import { getChromePath } from "../../src/chrome_client.ts";
import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";

Rhum.testPlan("tests/unit/client.ts", () => {
  for (const browserItem of browserList) {
    Rhum.testSuite("querySelector()", () => {
      // TODO :: Tets if selector doesnt exist or is invalid etc
      Rhum.testCase(
        "Should throw an error when selector is invalid",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          await Sinco.location("https://chromestatus.com");
          const error = {
            errored: false,
            msg: "",
          };
          const elem = await Sinco.querySelector("hkkkjgjkgk");
          try {
            await elem.click();
          } catch (err) {
            error.errored = true;
            error.msg = err.message;
          }
          await Sinco.done();
          Rhum.asserts.assertEquals(error, {
            errored: true,
            msg: `todo`,
          });
        },
      );
      Rhum.testCase(
        "It should throw an error when no element exists for the selector",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          await Sinco.location("https://chromestatus.com");
          const error = {
            errored: false,
            msg: "",
          };
          const elem = await Sinco.querySelector("a#dont-exist");
          try {
            await elem.click();
          } catch (err) {
            error.errored = true;
            error.msg = err.message;
          }
          await Sinco.done();
          Rhum.asserts.assertEquals(error, {
            errored: true,
            msg:
              `TypeError: Cannot read properties of null (reading 'click')\n    at <anonymous>:1:39: "document.querySelector('a#dont-exist').click()"`,
          });
        },
      );
    });

    Rhum.testSuite("build()", () => {
      Rhum.testCase(
        `Will start ${browserItem.name} headless as a subprocess`,
        async () => {
          const Sinco = await buildFor(browserItem.name);
          const res = await fetch("http://localhost:9292/json/list");
          const json = await res.json();
          // Our ws client should be able to connect if the browser is running
          const client = new WebSocket(json[0]["webSocketDebuggerUrl"]);
          const promise = deferred();
          client.onopen = function () {
            client.close();
          };
          client.onclose = function () {
            promise.resolve();
          };
          await promise;
          await Sinco.done();
        },
      );
      Rhum.testCase(
        "Uses the port when passed in to the parameters",
        async () => {
          const Sinco = await buildFor(browserItem.name, {
            debuggerPort: 9999,
          });
          const res = await fetch("http://localhost:9999/json/list");
          const json = await res.json();
          // Our ws client should be able to connect if the browser is running
          const client = new WebSocket(json[0]["webSocketDebuggerUrl"]);
          const promise = deferred();
          client.onopen = function () {
            client.close();
          };
          client.onclose = function () {
            promise.resolve();
          };
          await promise;
          await Sinco.done();
        },
      );
      Rhum.testCase(
        "Uses the hostname when passed in to the parameters",
        async () => {
          // Unable to test properly, as windows doesnt like 0.0.0.0 or localhost, so the only choice is 127.0.0.1 but this is already the default
        },
      );
      Rhum.testCase(
        "Uses the binaryPath when passed in to the parameters",
        async () => {
          const Sinco = await buildFor(browserItem.name, {
            binaryPath: await getChromePath(),
          });

          const res = await fetch("http://localhost:9292/json/list");
          const json = await res.json();
          // Our ws client should be able to connect if the browser is running
          const client = new WebSocket(json[0]["webSocketDebuggerUrl"]);
          const promise = deferred();
          client.onopen = function () {
            client.close();
          };
          client.onclose = function () {
            promise.resolve();
          };
          await promise;
          await Sinco.done();
        },
      );
    });

    Rhum.testSuite("assertUrlIs()", () => {
      Rhum.testCase("Works when an assertion is true", async () => {
        const Sinco = await buildFor(browserItem.name);
        await Sinco.location("https://chromestatus.com/features");
        await Sinco.assertUrlIs("https://chromestatus.com/features");
        await Sinco.done();
      });
      Rhum.testCase("Will fail when an assertion fails", async () => {
        const Sinco = await buildFor(browserItem.name);
        await Sinco.location("https://chromestatus.com");
        let originalErrMsg = "";
        try {
          await Sinco.assertUrlIs("https://hella.com");
        } catch (error) {
          originalErrMsg = error.message;
        }
        await Sinco.done();
        const msgArr = originalErrMsg.split("\n").filter((line) => {
          return !!line === true && line.indexOf(" ") !== 0 &&
            line.indexOf("Values") < 0;
        });
        Rhum.asserts.assertEquals(
          msgArr[0],
          "\x1b[31m\x1b[1m-   https://\x1b[41m\x1b[37mchromestatus\x1b[31m\x1b[49m.com\x1b[41m\x1b[37m/\x1b[31m\x1b[49m\x1b[41m\x1b[37mfeatures\x1b[31m\x1b[49m",
        );
        Rhum.asserts.assertEquals(
          msgArr[1],
          "\x1b[22m\x1b[39m\x1b[32m\x1b[1m+   https://\x1b[42m\x1b[37mhella\x1b[32m\x1b[49m.com",
        );
      });
    });

    Rhum.testSuite("location()", () => {
      Rhum.testCase("Successfully navigates when url is correct", async () => {
        const Sinco = await buildFor(browserItem.name);
        await Sinco.location("https://chromestatus.com/roadmap");
        await Sinco.assertUrlIs("https://chromestatus.com/roadmap");
        await Sinco.done();
      });
      Rhum.testCase(
        "Throws an error when there was an error navving to the page",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          let msg = "";
          try {
            await Sinco.location(
              "https://hellaDOCSWOWThispagesurelycantexist.biscuit",
            );
          } catch (err) {
            msg = err.message;
          }
          await Sinco.done();
          Rhum.asserts.assertEquals(
            msg,
            'net::ERR_NAME_NOT_RESOLVED: Error for navigating to page "https://hellaDOCSWOWThispagesurelycantexist.biscuit"',
          );
        },
      );
    });

    Rhum.testSuite("assertSee()", () => {
      Rhum.testCase(
        "Assertion should work when text is present on page",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          await Sinco.location("https://chromestatus.com/features");
          await Sinco.assertSee("Chrome Platform Status");
          await Sinco.done();
        },
      );
      Rhum.testCase(
        "Assertion should NOT work when text is NOT present on page",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          await Sinco.location("https://chromestatus.com");
          let errorMsg = "";
          try {
            await Sinco.assertSee("Crumpets and tea init?");
          } catch (err) {
            errorMsg = err.message;
          }
          await Sinco.done();
          const msgArr = errorMsg.split("\n").filter((line) => {
            return !!line === true && line.indexOf(" ") !== 0 &&
              line.indexOf("Values") < 0;
          });
          Rhum.asserts.assertEquals(msgArr[0].indexOf("-   false") > -1, true);
          Rhum.asserts.assertEquals(msgArr[1].indexOf("+   true") > -1, true);
        },
      );
    });

    Rhum.testSuite("evaluatePage()", () => {
      Rhum.testCase(
        "It should evaluate function on current frame",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          await Sinco.location("https://drash.land");
          const pageTitle = await Sinco.evaluatePage(() => {
            // deno-lint-ignore no-undef
            return document.title;
          });
          await Sinco.done();
          Rhum.asserts.assertEquals(pageTitle, "Drash Land");
        },
      );
      Rhum.testCase("It should evaluate string on current frame", async () => {
        const Sinco = await buildFor(browserItem.name);
        await Sinco.location("https://chromestatus.com");
        const parentConstructor = await Sinco.evaluatePage(`1 + 2`);
        await Sinco.done();
        Rhum.asserts.assertEquals(parentConstructor, 3);
      });
    });

    Rhum.testSuite("done()", () => {
      Rhum.testCase(
        "Should close the sub process eg pid on users machine",
        async () => {
          // TODO(any): How do we do this? We could return the browser process rid and pid in the done() method, but what can we do with it? Eg checking `ps -a`, should not have the process process once we call `done()`
        },
      );
    });

    Rhum.testSuite("waitForPageChange()", () => {
      Rhum.testCase(
        "Waits for a page to change before continuing",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          await Sinco.location("https://chromestatus.com");
          await Sinco.assertUrlIs("https://chromestatus.com/features");
          const elem = await Sinco.querySelector('a[href="/roadmap"]');
          await elem.click();
          await Sinco.waitForPageChange();
          await Sinco.assertUrlIs("https://chromestatus.com/roadmap");
          await Sinco.done();
        },
      );
    });

    Rhum.testSuite("takeScreenshot()", () => {
      const ScreenshotsFolder = "Screenshots";

      Rhum.beforeAll(() => {
        try {
          Deno.removeSync(ScreenshotsFolder, { recursive: true });
        } catch (_e) {
          //
        } finally {
          Deno.mkdirSync(ScreenshotsFolder);
        }
      });

      Rhum.testCase(
        "Throws an error if provided path doesn't exist",
        async () => {
          let msg = "";
          const Sinco = await buildFor(browserItem.name);
          await Sinco.location("https://chromestatus.com");
          try {
            await Sinco.takeScreenshot("eieio");
          } catch (error) {
            msg = error.message;
          }

          Rhum.asserts.assertEquals(
            msg,
            `The provided folder path - eieio doesn't exist`,
          );
        },
      );

      Rhum.testCase(
        "Takes a Screenshot with timestamp as filename if filename is not provided",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          await Sinco.location("https://chromestatus.com");
          const fileName = await Sinco.takeScreenshot(ScreenshotsFolder);
          await Sinco.done();
          Rhum.asserts.assertEquals(
            existsSync(
              fileName,
            ),
            true,
          );
        },
      );

      Rhum.testCase(
        "Takes Screenshot of only the element passed as selector and also quality(only if the image is jpeg)",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          await Sinco.location("https://chromestatus.com");
          const fileName = await Sinco.takeScreenshot(ScreenshotsFolder, {
            selector: "span",
            quality: 50,
          });
          await Sinco.done();
          Rhum.asserts.assertEquals(
            existsSync(
              fileName,
            ),
            true,
          );
        },
      );

      Rhum.testCase(
        "Throws an error when format passed is jpeg(or default) and quality > than 100",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          await Sinco.location("https://chromestatus.com");
          let msg = "";
          try {
            await Sinco.takeScreenshot(ScreenshotsFolder, { quality: 999 });
          } catch (error) {
            msg = error.message;
          }
          await Sinco.done();
          Rhum.asserts.assertEquals(
            msg,
            "A quality value greater than 100 is not allowed.",
          );
        },
      );

      Rhum.testCase("Saves Screenshot with Given Filename", async () => {
        const Sinco = await buildFor(browserItem.name);
        await Sinco.location("https://chromestatus.com");
        await Sinco.takeScreenshot(ScreenshotsFolder, { fileName: "Happy" });
        await Sinco.done();
        Rhum.asserts.assertEquals(
          existsSync(`${ScreenshotsFolder}/Happy.jpeg`),
          true,
        );
      });

      Rhum.testCase(
        "Saves Screenshot with given format (jpeg | png)",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          await Sinco.location("https://chromestatus.com");
          const fileName = await Sinco.takeScreenshot(ScreenshotsFolder, {
            format: "png",
          });
          await Sinco.done();
          Rhum.asserts.assertEquals(
            existsSync(
              fileName,
            ),
            true,
          );
        },
      );

      Rhum.testCase("Saves Screenshot with all options provided", async () => {
        const Sinco = await buildFor(browserItem.name);
        await Sinco.location("https://chromestatus.com");
        await Sinco.takeScreenshot(ScreenshotsFolder, {
          fileName: "AllOpts",
          selector: "span",
          format: "jpeg",
          quality: 100,
        });
        await Sinco.done();
        Rhum.asserts.assertEquals(
          existsSync(`${ScreenshotsFolder}/AllOpts.jpeg`),
          true,
        );
      });

      Rhum.afterAll(() => {
        Deno.removeSync(ScreenshotsFolder, { recursive: true });
      });
    });
    // Rhum.testSuite("waitForAnchorChange()", () => {
    //   Rhum.testCase("Waits for any anchor changes after an action", async () => {
    //     const Sinco = await ChromeClient.build();
    //     await Sinco.goTo("https://chromestatus.com");
    //     await Sinco.type('input[placeholder="Filter"]', "Gday");
    //     await Sinco.waitForAnchorChange();
    //     await Sinco.assertUrlIs("https://chromestatus.com/features#Gday");
    //     await Sinco.done();
    //   });
    // });
  }
});
Rhum.run();
