import { Rhum } from "../deps.ts";
import { Dawn } from "../../mod.ts";

Rhum.testPlan("tests/integration/dawn_test.ts", () => {
  Rhum.testSuite("assertUrlIs()", () => {
    Rhum.testCase("Assertion should work", async () => {
      const dawn = new Dawn("https://chromestatus.com");
      await dawn.start();
      await dawn.assertUrlIs("https://chromestatus.com/features");
      await dawn.done();
    });
  });
  Rhum.testSuite("assertSee()", () => {
    Rhum.testCase("Assertion should work", async () => {
      const dawn = new Dawn("https://chromestatus.com");
      await dawn.start();
      await dawn.assertSee("Chrome Platform Status");
      await dawn.done();
    });
  });
});

Rhum.run();
