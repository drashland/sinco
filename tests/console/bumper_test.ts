import { assertEquals } from "../../deps.ts";

Deno.test("Updates chrome version in dockerfile", async () => {
  const chromeVersionsRes = await fetch(
    "https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions",
  );
  const { versions } = await chromeVersionsRes.json();
  const version = versions[0].version;
  const originalContents = Deno.readTextFileSync(
    "./tests/integration/docker_test/drivers.dockerfile",
  );
  let newContent = originalContents;
  newContent.replace(/CHROME_VERSION \".*\"/, 'CHROME VERSION "123"');
  Deno.writeTextFileSync(
    "./tests/integration/docker_test/drivers.dockerfile",
    newContent,
  );
  const p = new Deno.Command('deno', {
    args: ["run", "-A", "console/bumper_ci_service.ts"],
  });
  const child = p.spawn();
  await child.status;
  child.kill();
  newContent = Deno.readTextFileSync(
    "./tests/integration/docker_test/drivers.dockerfile",
  );
  assertEquals(newContent.includes(`CHROME_VERSION "${version}"`), true);
});
