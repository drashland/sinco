import { Rhum } from "../deps.ts";
/**
 * Other ways you can achieve this are:
 *
 * 1. If you have one page that gives you the token, you can goTo that, then carry on goToing your protected resources, because the cookies will carry over (assuming you've configured the cookies on your end correctly)
 */

const title =
  "CSRF Protected Pages - Tutorial for this feature in the docs should work";

import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  Deno.test("Chrome: " + title, async () => {
    const Sinco = await buildFor(browserItem.name);
    await Sinco.location("https://drash.land");
    await Sinco.setCookie("X-CSRF-TOKEN", "hi:)", "https://drash.land");
    await Sinco.location("https://drash.land/drash/v1.x/#/"); // Going here to ensure the cookie stays
    const cookieVal = await Sinco.evaluatePage(() => {
      return document.cookie;
    });
    await Sinco.done();
    Rhum.asserts.assertEquals(cookieVal, "X-CSRF-TOKEN=hi:)");
  });
}
