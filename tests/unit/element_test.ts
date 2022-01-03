import { buildFor } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";
import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  // if (browserItem.name === "firefox") {
  //   Deno.test("click() | It should allow clicking of elements and update location", async () => {
  //     const { browser, page } = await buildFor(browserItem.name);
  //     await page.location("https://drash.land");
  //       const elem = await page.querySelector('a[href="https://discord.gg/RFsCSaHRWK"]');
  //       console.log('clicikng')
  //       await elem.click({}, true);
  //       console.log('clciked')
  //       const page1Location = await page.location()
  //       console.log('gotloc')
  //       await browser.close()
  //       assertEquals(page1Location, "https://discord.com/invite/RFsCSaHRWK")
  //   });
  // }
  Deno.test("click() | It should allow clicking of elements and update location", async () => {
    const { browser, page } = await buildFor(browserItem.name);
    await page.location("https://drash.land");
    const elem = await page.querySelector(
      'a[href="https://discord.gg/RFsCSaHRWK"]',
    );
    console.log("clicikng");
    await elem.click({}, true);
    console.log("clciked");
    const page1Location = await page.location();
    console.log("gotloc");
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
    const page2location = await browser.pages[1].location();
    await browser.close();
    assertEquals(page1Location, "https://drash.land/");
    assertEquals(page2location, "https://github.com/drashland");
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
