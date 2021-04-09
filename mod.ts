import {
  BuildOptions as ChromeBuildOptions,
  ChromeClient,
} from "./src/chrome_client.ts";
import {
  BuildOptions as FirefoxBuildOptions,
  FirefoxClient,
} from "./src/firefox_client.ts";

export { ChromeClient, FirefoxClient };

type Browsers = "firefox" | "chrome";

type Options = (FirefoxBuildOptions | ChromeBuildOptions);

export async function buildFor(
  browser: Browsers,
  options?: Options,
): Promise<ChromeClient | FirefoxClient> {
  if (browser === "firefox") {
    const Firefox = await FirefoxClient.build(options);
    return Firefox;
  } else {
    const Chrome = await ChromeClient.build(options);
    return Chrome;
  }
}
