import { build } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";
import { server } from "../server.ts";
import { resolve } from "../deps.ts";
Deno.test("click()", async (t) => {
  await t.step(
    "It should allow clicking of elements and update location",
    async () => {
      const { browser, page } = await build();
      server.run();
      await page.location(server.address + "/anchor-links");
      const elem = await page.querySelector(
        "a#not-blank",
      );
      await elem.click({
        waitFor: "navigation",
      });
      const page1Location = await page.evaluate(() => window.location.href);
      await browser.close();
      await server.close();
      assertEquals(page1Location, "https://discord.com/invite/RFsCSaHRWK");
    },
  );

  await t.step(
    "It should error if the HTML for the element is invalid",
    async () => {
      const { browser, page } = await build();
      server.run();
      await page.location(server.address + "/anchor-links");
      const elem = await page.querySelector(
        "a#invalid-link",
      );
      let error = null;
      try {
        await elem.click({
          waitFor: "navigation",
        });
      } catch (e) {
        error = e.message;
      }
      await browser.close();
      await server.close();
      assertEquals(
        error,
        'Unable to click the element "a#invalid-link". It could be that it is invalid HTML',
      );
    },
  );
});

Deno.test("takeScreenshot()", async (t) => {
  await t.step(
    "Takes Screenshot of only the element passed as selector and also quality(only if the image is jpeg)",
    async () => {
      const { browser, page } = await build();
      await page.location("https://drash.land");
      const img = await page.querySelector("img");
      await img.takeScreenshot({
        quality: 50,
      });
      await browser.close();
    },
  );

  await t.step("Saves Screenshot with all options provided", async () => {
    const { browser, page } = await build();
    server.run();
    await page.location(server.address + "/anchor-links");
    const a = await page.querySelector("a");
    await a.takeScreenshot({
      format: "jpeg",
      quality: 100,
    });
    await browser.close();
    await server.close();
  });
});

Deno.test({
  name: "files()",
  fn: async (t) => {
    await t.step(
      "Should throw if multiple files and input isnt multiple",
      async () => {
        server.run();
        const { browser, page } = await build();
        await page.location(server.address + "/input");
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
      const { browser, page } = await build();
      await page.location(server.address + "/input");
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
      const { browser, page } = await build();
      await page.location(server.address + "/input");
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
      const { browser, page } = await build();
      await page.location(server.address + "/input");
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
});

Deno.test({
  name: "file()",
  fn: async (t) => {
    await t.step("Should throw if element isnt an input", async () => {
      server.run();
      const { browser, page } = await build();
      await page.location(server.address + "/input");
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
      const { browser, page } = await build();
      await page.location(server.address + "/input");
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
      const { browser, page } = await build();
      await page.location(server.address + "/input");
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
});
