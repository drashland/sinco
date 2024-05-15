const chromeVersionsRes = await fetch(
  "https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions",
);
const { versions } = await chromeVersionsRes.json();

const dockerfile = Deno.readTextFileSync("./tests/drivers.dockerfile")
  .replace(/ENV CHROME_VERSION \".*\"/, `ENV CHROME_VERSION "${versions[0].version}"`);

Deno.writeTextFileSync('./tests/drivers.dockerfile', dockerfile);