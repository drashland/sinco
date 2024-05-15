export const regexes = {
  // deno-lint-ignore camelcase
  const_statements: /version = ".+"/g,
  // deno-lint-ignore camelcase
  egg_json: /"version": ".+"/,
  // deno-lint-ignore camelcase
  import_export_statements: /sinco@v[0-9\.]+[0-9\.]+[0-9\.]/g,
  // deno-lint-ignore camelcase
  yml_deno: /deno: \[".+"\]/g,
};

const chromeVersionsRes = await fetch(
  "https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions",
);
const { versions } = await chromeVersionsRes.json();

export const bumperFiles = [
  {
    filename: "./tests/drivers.dockerfile",
    replaceTheRegex: /ENV CHROME_VERSION \".*\"/,
    replaceWith: `ENV CHROME_VERSION "${versions[0].version}"`,
  },
];
