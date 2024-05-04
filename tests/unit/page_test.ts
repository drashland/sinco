import { build } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";
import { server } from "../server.ts";
const remote = Deno.args.includes("--remoteBrowser");
const serverAdd = `http://${
  remote ? "host.docker.internal" : "localhost"
}:1447`;
Deno.test("page_test.ts", async (t) => {
  await t.step("takeScreenshot()", async (t) => {
    await t.step(
      "takeScreenshot() | Takes a Screenshot",
      async () => {
        const { browser, page } = await build({
          remote,
        });
        await page.location("https://drash.land");
        const result = await page.takeScreenshot();
        await browser.close();
        assertEquals(result instanceof Uint8Array, true);
      },
    );

    await t.step(
      "Throws an error when format passed is jpeg(or default) and quality > than 100",
      async () => {
        const { page } = await build({ remote });
        await page.location("https://drash.land");
        let msg = "";
        try {
          await page.takeScreenshot({ quality: 999 });
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
  });

  await t.step("evaluate()", async (t) => {
    await t.step(
      "It should evaluate function on current frame",
      async () => {
        const { browser, page } = await build({
          remote,
        });
        await page.location("https://drash.land");
        const pageTitle = await page.evaluate(() => {
          // deno-lint-ignore no-undef
          return document.querySelector("h1")?.textContent;
        });
        await browser.close();
        assertEquals(pageTitle, "Drash Land");
      },
    );
    await t.step("It should evaluate string on current frame", async () => {
      const { browser, page } = await build({ remote });
      await page.location("https://drash.land");
      const parentConstructor = await page.evaluate(`1 + 2`);
      await browser.close();
      assertEquals(parentConstructor, 3);
    });
    await t.step(
      "You should be able to pass arguments to the callback",
      async () => {
        const { browser, page } = await build({
          remote,
        });
        await page.location("https://drash.land");
        interface User {
          name: string;
          age: number;
        }
        type Answer = "yes" | "no";
        const user: User = {
          name: "Cleanup crew",
          age: 9001,
        };
        const answer: Answer = "yes";
        const result1 = await page.evaluate(
          (user: User, answer: Answer) => {
            return user.name + " " + answer;
          },
          user,
          answer,
        );
        const result2 = await page.evaluate(
          (user: User, answer: Answer) => {
            return {
              ...user,
              answer,
            };
          },
          user,
          answer,
        );
        await browser.close();
        assertEquals(result1, "Cleanup crew yes");
        assertEquals(result2, {
          name: "Cleanup crew",
          age: 9001,
          answer: "yes",
        });
      },
    );
  });

  await t.step("location()", async (t) => {
    await t.step(
      "Handles correctly and doesnt hang when invalid URL",
      async () => {
        const { browser, page } = await build({
          remote,
        });
        let error = null;
        try {
          await page.location("https://google.comINPUT");
        } catch (e) {
          error = e.message;
        }
        await browser.close();
        assertEquals(error, "net::ERR_NAME_NOT_RESOLVED");
      },
    );

    await t.step("Sets and gets the location", async () => {
      const { browser, page } = await build({ remote });
      await page.location("https://google.com");
      await page.location("https://drash.land");
      const url = await page.evaluate(() => window.location.href);
      await browser.close();
      assertEquals(url, "https://drash.land/");
    });
  });

  await t.step("cookie()", async (t) => {
    await t.step("Sets and gets cookies", async () => {
      const { browser, page } = await build({ remote });
      await page.location("https://drash.land");
      await page.cookie({
        name: "user",
        value: "ed",
        "url": "https://drash.land",
      });
      const cookies = await page.cookie();
      await browser.close();
      assertEquals(cookies, [
        {
          domain: "drash.land",
          expires: -1,
          httpOnly: false,
          name: "user",
          path: "/",
          priority: "Medium",
          sameParty: false,
          secure: true,
          session: true,
          size: 6,
          sourcePort: 443,
          sourceScheme: "Secure",
          value: "ed",
        },
      ]);
    });
  });

  await t.step({
    name: "consoleErrors()",
    fn: async (t) => {
      await t.step(`Should return expected errors`, async () => {
        server.run();
        const { browser, page } = await build({
          remote,
        });
        await page.location(
          serverAdd,
        );
        const errors = await page.consoleErrors();
        await browser.close();
        await server.close();
        assertEquals(
          errors,
          [
            "Failed to load resource: the server responded with a status of 404 (Not Found)",
            "ReferenceError: callUser is not defined\n" +
            `    at ${serverAdd}/index.js:1:1`,
          ],
        );
      });

      await t.step(`Should be empty if no errors`, async () => {
        const { browser, page } = await build({
          remote,
        });
        await page.location(
          "https://drash.land",
        );
        const errors = await page.consoleErrors();
        await browser.close();
        assertEquals(errors, []);
      });
    },
  }); //Ignoring until we figure out a way to run the server on a remote container accesible to the remote browser

  await t.step({
    name: "dialog()",
    fn: async (t) => {
      await t.step(`Accepts a dialog`, async () => {
        const { browser, page } = await build({
          remote,
        });
        server.run();
        await page.location(serverAdd + "/dialogs");
        const elem = await page.querySelector("#button");
        page.expectDialog();
        elem.click();
        await page.dialog(true, "Sinco 4eva");
        const val = await page.evaluate(
          `document.querySelector("#button").textContent`,
        );
        await browser.close();
        await server.close();
        assertEquals(val, "Sinco 4eva");
      });
      await t.step(`Throws if a dialog was not expected`, async () => {
        const { browser, page } = await build({
          remote,
        });
        let errMsg = "";
        try {
          await page.dialog(true, "Sinco 4eva");
        } catch (e) {
          errMsg = e.message;
        }
        await browser.close();
        assertEquals(
          errMsg,
          'Trying to accept or decline a dialog without you expecting one. ".expectDialog()" was not called beforehand.',
        );
      });
      await t.step(`Rejects a dialog`, async () => {
        const { browser, page } = await build({
          remote,
        });
        server.run();
        await page.location(serverAdd + "/dialogs");
        const elem = await page.querySelector("#button");
        page.expectDialog();
        elem.click();
        await page.dialog(false, "Sinco 4eva");
        const val = await page.evaluate(
          `document.querySelector("#button").textContent`,
        );
        await browser.close();
        await server.close();
        assertEquals(val, "");
      });
    },
  }); //Ignoring until we figure out a way to run the server on a remote container accesible to the remote browser
});
