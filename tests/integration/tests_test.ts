import { Rhum } from "../deps.ts";
import { Cinco } from "../../mod.ts";

Rhum.testPlan("tests/integration/tests_test.ts", () => {
  Rhum.testSuite("Extensive test", () => {
    Rhum.testCase("Should handle many actions and assertions", async () => {
      const cinco = new Cinco("https://chromestatus.com");
      await cinco.start();
      await cinco.assertUrlIs("https://chromestatus.com/features");
      await cinco.click('a[href="/features/schedule"]');
      await cinco.assertSee("Release timeline");
      await cinco.assertUrlIs("https://chromestatus.com/features/schedule");
      await cinco.done();
    });
  });
});

Rhum.run();
