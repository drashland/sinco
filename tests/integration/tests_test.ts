import { Rhum2 } from "../deps.ts";
import { Cinco } from "../../mod.ts";

Rhum2.testPlan(() => {
  Rhum2.testSuite("Extensive test", () => {
    Rhum2.testCase("Should handle many actions and assertions", async () => {
      const cinco = new Cinco("https://chromestatus.com");
      console.log('starting')
      await cinco.start();
      console.log('asserting url')
      await cinco.assertUrlIs("https://chromestatus.com/features");
      console.log('clicking')
      await cinco.click('a[href="/features/schedule"]');
      console.log('assert seeing')
      await cinco.assertSee("Release timeline");
      console.log('asserting url')
      await cinco.assertUrlIs("https://chromestatus.com/features/schedule");
      console.log('done')
      await cinco.done();
    });
  });
});
