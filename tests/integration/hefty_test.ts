import { Rhum } from "../deps.ts";
import { HeadlessBrowser } from "../../mod.ts";

Rhum.testPlan("tests/integration/tests_test.ts", () => {
  Rhum.testSuite("Extensive test", () => {
    Rhum.testCase("Should handle many actions and assertions", async () => {
      const Sinco = new HeadlessBrowser()
      await Sinco.build();
      await Sinco.goTo("https://chromestatus.com")
      await Sinco.assertUrlIs("https://chromestatus.com/features");
      await Sinco.click('a[href="/features/schedule"]');
      await Sinco.assertSee("Release timeline");
      await Sinco.assertUrlIs("https://chromestatus.com/features/schedule");
      await Sinco.done();
    });
  });
});

Rhum.run()

// TODO :: Afdd a bunch of tests for ensuring async op leaks dfontt appeear
