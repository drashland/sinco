import { Rhum } from "../deps.ts";
import { Sinco } from "../../mod.ts";

Rhum.testPlan(() => {
  Rhum.testSuite("Extensive test", () => {
    Rhum.testCase("Should handle many actions and assertions", async () => {
      const sinco = await Sinco.build("https://chromestatus.com");
      await sinco.assertUrlIs("https://chromestatus.com/features");
      await sinco.click('a[href="/features/schedule"]');
      await sinco.assertSee("Release timeline");
      await sinco.assertUrlIs("https://chromestatus.com/features/schedule");
      await sinco.done();
    });
  });
});
