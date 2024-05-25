import { Client } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";
import { server } from "../server.ts";
import { resolve } from "../deps.ts";
Deno.test("screenshot()", async (t) => {
  await t.step(
    "Takes a Screenshot",
    async () => {
      const { browser, page } = await Client.create();
      await page.location("https://drash.land");
      const result = await page.screenshot();
      await browser.close();
      assertEquals(result instanceof Uint8Array, true);
    },
  );

  await t.step(
    "Takes a Screenshot of an element",
    async () => {
      const { browser, page } = await Client.create();
      await page.location("https://drash.land");
      const result = await page.screenshot({
        element: "div",
      });
      await browser.close();
      assertEquals(result instanceof Uint8Array, true);
    },
  );

  await t.step(
    "Throws an error when format passed is jpeg(or default) and quality > than 100",
    async () => {
      const { page } = await Client.create();
      await page.location("https://drash.land");
      let msg = "";
      try {
        await page.screenshot({ quality: 999 });
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

Deno.test("evaluate()", async (t) => {
  await t.step(
    "It should evaluate function on current frame",
    async () => {
      const { browser, page } = await Client.create();
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
    const { browser, page } = await Client.create();
    await page.location("https://drash.land");
    const parentConstructor = await page.evaluate(`1 + 2`);
    await browser.close();
    assertEquals(parentConstructor, 3);
  });
  await t.step(
    "You should be able to pass arguments to the callback",
    async () => {
      const { browser, page } = await Client.create();
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

Deno.test("location()", async (t) => {
  await t.step(
    "Handles correctly and doesnt hang when invalid URL",
    async () => {
      const { browser, page } = await Client.create();
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
    const { browser, page } = await Client.create();
    await page.location("https://google.com");
    await page.location("https://drash.land");
    const url = await page.evaluate(() => window.location.href);
    await browser.close();
    assertEquals(url, "https://drash.land/");
  });
});

Deno.test("cookie()", async (t) => {
  await t.step("Sets and gets cookies", async () => {
    const { browser, page } = await Client.create();
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

Deno.test({
  name: "newPageClick()",
  fn: async (t) => {
    await t.step("Should click on a link and open a new page", async () => {
      const { browser, page } = await Client.create();
      server.run();
      await page.location(server.address + "/anchor-links");
      const newPage = await page.newPageClick("a#blank");
      const url = await newPage.evaluate(() => window.location.href);
      const originalUrl = await page.evaluate(() => window.location.href);
      await browser.close();
      await server.close();
      assertEquals(url, "https://drash.land/");
      assertEquals(originalUrl, server.address + "/anchor-links");
    });
  },
});

Deno.test({
  name: "consoleErrors()",
  fn: async (t) => {
    await t.step(`Should return expected errors`, async () => {
      server.run();
      const { browser, page } = await Client.create();
      await page.location(
        server.address,
      );
      const errors = await page.consoleErrors();
      await browser.close();
      await server.close();
      assertEquals(errors.length, 2);
      assertEquals(
        errors.includes(
          "ReferenceError: callUser is not defined\n" +
            `    at ${server.address}/index.js:1:1`,
        ),
        true,
      );
      assertEquals(
        errors.includes(
          "Failed to load resource: the server responded with a status of 404 (Not Found)",
        ),
        true,
      );
    });

    await t.step(`Should be empty if no errors`, async () => {
      const { browser, page } = await Client.create();
      await page.location(
        "https://drash.land",
      );
      const errors = await page.consoleErrors();
      await browser.close();
      assertEquals(errors, []);
    });
  },
});

Deno.test({
  name: "dialog()",
  fn: async (t) => {
    await t.step(`Accepts a dialog`, async () => {
      const { browser, page } = await Client.create();
      server.run();
      await page.location(server.address + "/dialogs");
      page.evaluate(`document.querySelector("#button").click()`);
      await page.dialog(true, "Sinco 4eva");
      const val = await page.evaluate(
        `document.querySelector("#button").textContent`,
      );
      await browser.close();
      await server.close();
      assertEquals(val, "Sinco 4eva");
    });
    await t.step(`Rejects a dialog`, async () => {
      const { browser, page } = await Client.create();
      server.run();
      await page.location(server.address + "/dialogs");
      page.evaluate(`document.querySelector("#button").click()`);
      await page.dialog(false, "Sinco 4eva");
      const val = await page.evaluate(
        `document.querySelector("#button").textContent`,
      );
      await browser.close();
      await server.close();
      assertEquals(val, "");
    });
  },
});

Deno.test({
  name: "files()",
  fn: async (t) => {
    await t.step(
      "Should throw if multiple files and input isnt multiple",
      async () => {
        server.run();
        const { browser, page } = await Client.create();
        await page.location(server.address + "/input");
        let errMsg = "";
        try {
          await page.setInputFiles({
            selector: "#single-file",
            files: ["ffff", "hhh"],
          });
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
      const { browser, page } = await Client.create();
      await page.location(server.address + "/input");
      let errMsg = "";
      try {
        await page.setInputFiles({
          selector: "p",
          files: ["ffff"],
        });
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
      const { browser, page } = await Client.create();
      await page.location(server.address + "/input");
      let errMsg = "";
      try {
        await page.setInputFiles({
          selector: "#text",
          files: ["ffff"],
        });
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
      const { browser, page } = await Client.create();
      await page.location(server.address + "/input");
      try {
        await page.setInputFiles({
          selector: "#multiple-file",
          files: [
            resolve("./README.md"),
            resolve("./tsconfig.json"),
          ],
        });
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

    await t.step("Should successfully upload a file", async () => {
      server.run();
      const { browser, page } = await Client.create();
      await page.location(server.address + "/input");
      try {
        await page.setInputFiles({
          selector: "#single-file",
          files: [
            resolve("./tsconfig.json"),
          ],
        });
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
});
