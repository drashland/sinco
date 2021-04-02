import { Rhum } from "../deps.ts";
import { FirefoxClient } from "../../mod.ts";
import { defaultBuildOptions } from "../../src/firefox_client.ts";

Rhum.testPlan("tests/unit/firefox_client_test.ts", () => {

  Rhum.testSuite("goto()", () => {
    Rhum.testCase("Successfully navigates when url is correct", async () => {
      const Sinco = await FirefoxClient.build();
      await Sinco.goTo("https://chromestatus.com/features/schedule");
      await Sinco.assertUrlIs("https://chromestatus.com/features/schedule");
      await Sinco.done();
    });
    Rhum.testCase(
      "Throws an error when there was an error navving to the page",
      async () => {
        const Sinco = await FirefoxClient.build();
        let msg = "";
        try {
          await Sinco.goTo(
            "https://hellaDOCSWOWThispagesurelycantexist.biscuit",
          );
        } catch (err) {
          msg = err.message;
        }
        await Sinco.done();
        Rhum.asserts.assertEquals(
          msg,
          'net::ERR_NAME_NOT_RESOLVED: Error for navigating to page "https://hellaDOCSWOWThispagesurelycantexist.biscuit"',
        );
      },
    );
  });

});

Rhum.run();
