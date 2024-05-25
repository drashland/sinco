import { assertEquals } from "../deps.ts";
import { deferred } from "../../deps.ts";
import { Client } from "../../mod.ts";

Deno.test("create()", async (t) => {
  await t.step("Registers close listener", async () => {
    await Client.create();
    const res = await fetch("http://localhost:9292/json/list");
    const json = await res.json();
    const client = new WebSocket(json[0]["webSocketDebuggerUrl"]);
    let promise = deferred();
    client.onopen = function () {
      promise.resolve();
    };
    await promise;
    promise = deferred();
    client.onclose = () => promise.resolve();
    dispatchEvent(new CustomEvent("timeout"));
    await promise;
  });
  await t.step(
    "Uses the port when passed in to the parameters",
    async () => {
      const { browser } = await Client.create({
        debuggerPort: 9999,
      });
      const res = await fetch("http://localhost:9999/json/list");
      const json = await res.json();
      // Our ws client should be able to connect if the browser is running
      const client = new WebSocket(json[0]["webSocketDebuggerUrl"]);
      let promise = deferred();
      client.onopen = function () {
        promise.resolve();
      };
      await promise;
      promise = deferred();
      client.onclose = function () {
        promise.resolve();
      };
      client.close();
      await promise;
      await browser.close();
    },
  );

  await t.step(
    `Will start headless as a subprocess`,
    async () => {
      const { browser } = await Client.create();
      const res = await fetch("http://localhost:9292/json/list");
      const json = await res.json();
      // Our ws client should be able to connect if the browser is running
      const client = new WebSocket(json[0]["webSocketDebuggerUrl"]);
      let promise = deferred();
      client.onopen = function () {
        promise.resolve();
      };
      await promise;
      promise = deferred();
      client.onclose = function () {
        promise.resolve();
      };
      client.close();
      await promise;
      await browser.close();
    },
  );

  await t.step(
    "Uses the hostname when passed in to the parameters",
    async () => {
      // Unable to test properly, as windows doesnt like 0.0.0.0 or localhost, so the only choice is 127.0.0.1 but this is already the default
    },
  );

  await t.step(
    {
      name: "Uses the binaryPath when passed in to the parameters",
      fn: async () => {
        const { browser } = await Client.create({
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
    },
  );
});

Deno.test(`close()`, async (t) => {
  await t.step(
    `Should close all resources, and throw if speciified`,
    async () => {
      const { browser, page } = await Client.create();
      await page.location("https://drash.land");
      let errMsg = "";
      try {
        await browser.close("Some error message");
      } catch (e) {
        errMsg = e.message;
      }
      assertEquals(errMsg, "Some error message");
      // If resources are not closed or pending ops or leaked, this test will show it when ran
    },
  );
});
