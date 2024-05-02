import { deferred } from "../../deps.ts";
import { build } from "../../mod.ts";

const remote = Deno.args.includes("--remoteBrowser");

Deno.test("client_test.ts", async (t) => {
  await t.step("create()", async (t) => {
    await t.step(
      "Uses the port when passed in to the parameters",
      async () => {
        const { browser } = await build({
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
        const { browser } = await build({ remote });
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
          const { browser } = await build({
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
        ignore: remote, //Ignoring as binary path is not a necessisty to test for remote browsers
      },
    );
  });

  await t.step(`close()`, async (t) => {
    await t.step(`Should close all resources and not leak any`, async () => {
      const { browser, page } = await build({ remote });
      await page.location("https://drash.land");
      await browser.close();
      // If resources are not closed or pending ops or leaked, this test will show it when ran
    });

    await t.step({
      name: `Should close all page specific resources too`,
      fn: async () => {
        const { browser, page } = await build({
          remote,
        });
        await page.location("https://drash.land");
        await browser.close();
        if (!remote) {
          try {
            const listener = Deno.listen({
              port: 9292,
              hostname: "localhost",
            });
            listener.close();
          } catch (e) {
            if (e instanceof Deno.errors.AddrInUse) {
              throw new Error(
                `Seems like the subprocess is still running: ${e.message}`,
              );
            }
          }
        } else {
          const { browser: br2 } = await build({
            remote,
          });
          await br2.close();
        }
        // If resources are not closed or pending ops or leaked, this test will show it when ran
      },
    });
  });
});
