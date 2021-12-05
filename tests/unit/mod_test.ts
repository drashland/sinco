import { Rhum } from "../deps.ts";
import { buildFor } from "../../mod.ts";

Rhum.testPlan("tests/unit/mod_test.ts", () => {
  Rhum.testSuite("buildFor()", () => {
    Rhum.testCase("Builds for firefox correctly", async () => {
      const Sinco = await buildFor("firefox");
      await Sinco.location("https://drash.land"); // Go to this page
      await Sinco.assertUrlIs("https://drash.land");
      await Sinco.done();
    });
    Rhum.testCase("Builds for chrome correctly", async () => {
      const Sinco = await buildFor("chrome");
      await Sinco.location("https://drash.land"); // Go to this page
      await Sinco.assertUrlIs("https://drash.land");
      await Sinco.done();
    });
  });
});

Rhum.run();
