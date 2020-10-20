import { Rhum } from "../deps.ts";
import { Cinco } from "../../mod.ts";

Rhum.testPlan(() => {
  Rhum.testSuite("assertUrlIs()", () => {
    Rhum.testCase("Assertion should work", async () => {
      const cinco = await Cinco.build("https://chromestatus.com");
      await cinco.assertUrlIs("https://chromestatus.com/features");
      await cinco.done();
    });
  });
  Rhum.testSuite("assertSee()", () => {
    Rhum.testCase("Assertion should work", async () => {
      const cinco = await Cinco.build("https://chromestatus.com");
      await cinco.assertSee("Chrome Platform Status");
      await cinco.done();
    });
  });
});
