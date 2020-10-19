import { Rhum } from "../deps.ts";
import { Dawn } from "../../mod.ts";

Rhum.testPlan("tests/integration/tests_test.ts", () => {
  Rhum.testSuite("Extensive test", () => {
    Rhum.testCase("Should handle many actions and assertions", async () => {
      const dawn = new Dawn("https://chromestatus.com");
      await dawn.start();
      await dawn.assertUrlIs("https://chromestatus.com/features");
      await dawn.click('a[href="/features/schedule"]')
      await dawn.assertSee("Release timeline")
      await dawn.assertUrlIs("https://chromestatus.com/features/schedule")
      await dawn.done();
    });
  })
})

Rhum.run();