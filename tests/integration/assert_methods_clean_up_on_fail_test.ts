import { assertEquals } from "../../deps.ts";
import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";

/**
 * The reason for this test is because originally, when an assertion  method failed,
 * sinco would cleanup, so the browser sub process will still be running
 * (eg chrome is still running, se `ps -a`). So if a user runs their test again,
 * this will cause their tests to just hang (its something to do with Sinco trying
 * to connect and talk to the WbeSocket if more than 1 browser sub process
 * is still running
 *
 * How it SHOULD work before we cleanup:
 * 1. Test runs
 * 2. test fails
 * 3. `ps -a` still shows sub process
 * 4. user runs test again
 * 5. hangs
 *
 * How this test SHOULD run:
 * 1. test runs
 * 2. test fails
 * 3. test runs
 * 4. test fails
 */

// THIS TEST SHOULD NOT HANG, IF IT DOES, THEN THIS TEST FAILS

for (const browserItem of browserList) {
  Deno.test(
    browserItem.name + ": Assertion methods cleanup when an assertion fails",
    async () => {
      const Sinco = await buildFor(browserItem.name);
      await Sinco.location("https://chromestatus.com");
      await Sinco.assertUrlIs("https://chromestatus.com/features");
      let gotError = false;
      let errMsg = "";
      try {
        await Sinco.assertSee("Chrome Versions"); // Does not exist on the page (the `V` is lowercase, whereas here we use an uppercase)
      } catch (err) {
        gotError = true;
        errMsg = err.message
          // deno-lint-ignore no-control-regex
          .replace(/\x1b/g, "") // or \x1b\[90m
          .replace(/\[1m/g, "")
          .replace(/\[[0-9][0-9]m/g, "")
          .replace(/\n/g, "");
      }
      assertEquals(gotError, true);
      assertEquals(
        errMsg,
        "Values are not equal:    [Diff] Actual / Expected-   false+   true",
      );
      // Now we should be able to run tests again without it hanging
      const Sinco2 = await buildFor(browserItem.name);
      await Sinco2.location("https://chromestatus.com");
      await Sinco2.assertUrlIs("https://chromestatus.com/features");
      try {
        await Sinco2.assertSee("Chrome Versions");
      } catch (_err) {
        //
      }
    },
  );
}
