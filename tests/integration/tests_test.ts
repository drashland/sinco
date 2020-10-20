import { Rhum } from "../deps.ts";
import { Cinco } from "../../mod.ts";

Rhum.testPlan(() => {
  Rhum.testSuite("Extensive test", () => {
    Rhum.testCase("Should handle many actions and assertions", async () => {
      const cinco = await Cinco.build("https://chromestatus.com");
      await cinco.assertUrlIs("https://chromestatus.com/features");
      await cinco.click('a[href="/features/schedule"]');
      await cinco.assertSee("Release timeline");
      await cinco.assertUrlIs("https://chromestatus.com/features/schedule");
      await cinco.done();
    });
  });
});
