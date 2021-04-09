import { Rhum } from "../deps.ts";
import { buildFor } from "../../mod.ts";
import { assertEquals } from "../../deps.ts";

Rhum.testPlan("tests/unit/mod_test.ts", () => {
  Rhum.testSuite("buildFor()", () => {
    Rhum.testCase("Builds for firefox correctly", async () => {
      const Sinco = await buildFor("firefox");
      await Sinco.goTo("https://chromestatus.com"); // Go to this page
      await Sinco.assertUrlIs("https://chromestatus.com/features");
      await Sinco.type('input[placeholder="Filter"]', "Hello");
      const value = await Sinco.getInputValue('input[placeholder="Filter"]');
      assertEquals(value, "Hello");
      await Sinco.click('a[href="/features/schedule"]');
      await Sinco.waitForPageChange();
      await Sinco.assertUrlIs("https://chromestatus.com/features/schedule");
      await Sinco.assertSee("Release timeline");
      await Sinco.done();
    });
    Rhum.testCase("Builds for chrome correctly", async () => {
      const Sinco = await buildFor("chrome");
      await Sinco.goTo("https://chromestatus.com"); // Go to this page
      await Sinco.assertUrlIs("https://chromestatus.com/features");
      await Sinco.type('input[placeholder="Filter"]', "Hello");
      const value = await Sinco.getInputValue('input[placeholder="Filter"]');
      assertEquals(value, "Hello");
      await Sinco.click('a[href="/features/schedule"]');
      await Sinco.waitForPageChange();
      await Sinco.assertUrlIs("https://chromestatus.com/features/schedule");
      await Sinco.assertSee("Release timeline");
      await Sinco.done();
    });
  });
});

Rhum.run();
