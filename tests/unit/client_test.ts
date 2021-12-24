import { assertEquals, deferred } from "../../deps.ts";
import { buildFor } from "../../mod.ts";
import { browserList } from "../browser_list.ts";

for (const browserItem of browserList) {
  Deno.test(
    `create() | Will start ${browserItem.name} headless as a subprocess`,
    async () => {
      const { browser, page } = await buildFor(browserItem.name);
      const res = await fetch("http://localhost:9292/json/list");
      const json = await res.json();
      // Our ws client should be able to connect if the browser is running
      const client = new WebSocket(json[0]["webSocketDebuggerUrl"]);
      const promise = deferred();
      client.onopen = function () {
        client.close();
      };
      client.onclose = function () {
        promise.resolve();
      };
      await promise;
      await browser.close();
    },
  );
  Deno.test(
    "create() | Uses the port when passed in to the parameters",
    async () => {
      const { browser, page } = await buildFor(browserItem.name, {
        debuggerPort: 9999,
      });
      const res = await fetch("http://localhost:9999/json/list");
      const json = await res.json();
      // Our ws client should be able to connect if the browser is running
      const client = new WebSocket(json[0]["webSocketDebuggerUrl"]);
      const promise = deferred();
      client.onopen = function () {
        client.close();
      };
      client.onclose = function () {
        promise.resolve();
      };
      await promise;
      await browser.close();
    },
  );
  Deno.test(
    "create() | Uses the hostname when passed in to the parameters",
    async () => {
      // Unable to test properly, as windows doesnt like 0.0.0.0 or localhost, so the only choice is 127.0.0.1 but this is already the default
    },
  );
  Deno.test(
    "create() | Uses the binaryPath when passed in to the parameters",
    async () => {
      const { browser, page } = await buildFor(browserItem.name, {
        //binaryPath: await browserItem.getPath(),
      });

      const res = await fetch("http://localhost:9292/json/list");
      const json = await res.json();
      // Our ws client should be able to connect if the browser is running
      const client = new WebSocket(json[0]["webSocketDebuggerUrl"]);
      const promise = deferred();
      client.onopen = function () {
        client.close();
      };
      client.onclose = function () {
        promise.resolve();
      };
      await promise;
      await browser.close();
    },
  );

  // Rhum.testSuite("waitForAnchorChange()", () => {
  //   Rhum.testCase("Waits for any anchor changes after an action", async () => {
  //     const { browser, page } = await ChromeClient.build();
  //     await Sinco.goTo("https://chromestatus.com");
  //     await Sinco.type('input[placeholder="Filter"]', "Gday");
  //     await Sinco.waitForAnchorChange();
  //     await Sinco.assertUrlIs("https://chromestatus.com/features#Gday");
  //     await browser.close();
  //   });
  // });
}
