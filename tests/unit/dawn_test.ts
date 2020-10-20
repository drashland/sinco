import { Rhum2 } from "../deps.ts";
import { Cinco } from "../../mod.ts";

Rhum2.testPlan(() => {
  Rhum2.testSuite("assertUrlIs()", () => {
    Rhum2.testCase("Assertion should work", async () => {
      const cinco = new Cinco("https://chromestatus.com");
      await cinco.start();
      await cinco.assertUrlIs("https://chromestatus.com/features");
      await cinco.done();
    });
  });
  Rhum2.testSuite("assertSee()", () => {
    Rhum2.testCase("Assertion should work", async () => {
      const cinco = new Cinco("https://chromestatus.com");
      await cinco.start();
      await cinco.assertSee("Chrome Platform Status");
      await cinco.done();
    });
  });
});
