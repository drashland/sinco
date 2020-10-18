import { Rhum } from "../deps.ts";
import { Dawn } from "../../mod.ts";

Rhum.testPlan("tests/integration/tests_test.ts", () => {
  Rhum.testSuite("Extensive example", () => {
    Rhum.testCase(
      "Should be able to do many operations for a given test",
      async () => {
        const dawn = new Dawn("https://chromestatus.com");
        await dawn.start();
        await dawn.assertUrlIs("https://chromestatus.com/features");
        await dawn.done();
        // TODO
      },
    );
  });
});

Rhum.run();
