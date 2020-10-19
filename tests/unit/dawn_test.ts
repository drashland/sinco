import { Rhum } from "../deps.ts";
import { Cinco } from "../../mod.ts";

Rhum.testPlan("tests/unit/cinco_test.ts", () => {
  Rhum.testSuite("assertUrlIs()", () => {
    Rhum.testCase("Assertion should work", async () => {
      const cinco = new Cinco("https://chromestatus.com");
      await cinco.start();
      await cinco.assertUrlIs("https://chromestatus.com/features");
      await cinco.done();
    });
  });
  Rhum.testSuite("assertSee()", () => {
    Rhum.testCase("Assertion should work", async () => {
      const cinco = new Cinco("https://chromestatus.com");
      await cinco.start();
      await cinco.assertSee("Chrome Platform Status");
      await cinco.done();
    });
  });
});

Rhum.run();
