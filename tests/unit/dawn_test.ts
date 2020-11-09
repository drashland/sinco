import { Rhum } from "../deps.ts";
import { Sinco } from "../../mod.ts";

Rhum.testPlan(() => {
  Rhum.testSuite("assertUrlIs()", () => {
    Rhum.testCase("Assertion should work", async () => {
      const sinco = await Sinco.build("https://chromestatus.com");
      await sinco.assertUrlIs("https://chromestatus.com/features");
      await sinco.done();
    });
  });
  Rhum.testSuite("assertSee()", () => {
    Rhum.testCase("Assertion should work", async () => {
      const sinco = await Sinco.build("https://chromestatus.com");
      await sinco.assertSee("Chrome Platform Status");
      await sinco.done();
    });
  });
});
