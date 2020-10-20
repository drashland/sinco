import { Rhum } from "../deps.ts";
import { Cinco } from "../../mod.ts";

Rhum.testPlan(() => {
  Rhum.testSuite("Extensive test", () => {
    Rhum.testCase("Should handle many actions and assertions", async () => {
      const cinco = new Cinco("https://chromestatus.com");
      console.log("starting");
      await cinco.start();
      console.log("asserting url");
      await cinco.assertUrlIs("https://chromestatus.com/features");
      console.log("clicking");
      await cinco.click('a[href="/features/schedule"]');
      console.log("assert seeing");
      // await cinco.assertSee("Release timeline");
      console.log("asserting url");
      await cinco.assertUrlIs("https://chromestatus.com/features/schedule");
      console.log("done");
      await cinco.done();
    });
  });
});
