import { assertEquals } from "../../deps.ts";
/**
 * Other ways you can achieve this are:
 *
 * 1. If you have one page that gives you the token, you can goTo that, then carry on goToing your protected resources, because the cookies will carry over (assuming you've configured the cookies on your end correctly)
 */

import { Client } from "../../mod.ts";

Deno.test(`Tutorial for this feature in the docs should work`, async () => {
  const { browser, page } = await Client.create();
  await page.location("https://drash.land");
  await page.cookie({
    name: "X-CSRF-TOKEN",
    value: "hi:)",
    url: "https://drash.land",
  });
  await page.location("https://drash.land/drash/v1.x/#/"); // Going here to ensure the cookie stays
  const cookieVal = await page.evaluate(() => {
    return document.cookie;
  });
  await browser.close();
  assertEquals(cookieVal, "X-CSRF-TOKEN=hi:)");
});
