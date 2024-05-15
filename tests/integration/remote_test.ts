import { assertEquals } from "../../deps.ts";
import { build, connect } from "../../mod.ts";
const serverAdd = `http://host.docker.internal:1447`;

const isRemote = Deno.args.includes("--remote");

Deno.test("manipulate_page_test.ts", async (t) => {
  await t.step({
    name: "Remote tests (various to test different aspects)",
    ignore: !isRemote,
    fn: async (t) => {
      await t.step("Can open and close fine", async () => {
        const { browser, page } = await connect({
          hostname: "localhost",
          debuggerPort: 9292,
        });

        // todo do soemthing

        await browser.close();
      });

      await t.step("Can visit pages", async () => {
        const { browser, page } = await connect({
          hostname: "localhost",
          debuggerPort: 9292,
        });

        // todo do soemthing

        await browser.close();
      });

      await t.step("Can open and close fine", async () => {
        const { browser, page } = await connect({
          hostname: "localhost",
          debuggerPort: 9292,
        });

        // todo do soemthing

        await browser.close();
      });

      await t.step("Can visit pages", async () => {
        const { browser, page } = await connect({
          hostname: "localhost",
          debuggerPort: 9292,
        });

        // todo do soemthing

        await browser.close();
      });

      await t.step("Can evaluate", async () => {
        const { browser, page } = await connect({
          hostname: "localhost",
          debuggerPort: 9292,
        });

        // todo do soemthing

        await browser.close();
      });

      await t.step("Can click elements", async () => {
        const { browser, page } = await connect({
          hostname: "localhost",
          debuggerPort: 9292,
        });

        // todo do soemthing

        await browser.close();
      });
    },
  });
});
