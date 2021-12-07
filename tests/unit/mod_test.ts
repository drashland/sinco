import { Rhum } from "../deps.ts";
import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";

Rhum.testPlan("tests/unit/mod_test.ts", () => {
  for (const browserItem of browserList) {
    Rhum.testSuite("buildFor()", () => {
      Rhum.testCase(
        "Builds for " + browserItem.name + " correctly",
        async () => {
          const Sinco = await buildFor(browserItem.name);
          await Sinco.goTo("https://drash.land"); // Go to this page
          await Sinco.assertUrlIs("https://drash.land/");
          await Sinco.done();
        },
      );
    });
  }
});

Rhum.run();
