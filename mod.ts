import { Client } from "./src/client.ts";
import { BuildOptions, Cookie, ScreenshotOptions } from "./src/interfaces.ts";
//import type { Browsers } from "./src/types.ts";
import { getChromeArgs } from "./src/utility.ts";
import { Page } from "./src/page.ts";

export type { BuildOptions, Cookie, ScreenshotOptions };

export async function buildFor(
  browser: "chrome",
  options: BuildOptions = {
    hostname: "localhost",
    debuggerPort: 9292,
    binaryPath: undefined,
    remote: false,
  },
): Promise<{
  browser: Client;
  page: Page;
}> {
  if (!options.debuggerPort) options.debuggerPort = 9292;
  if (!options.hostname) options.hostname = "localhost";
  //if (browser === "chrome") {
  const args = getChromeArgs(options.debuggerPort, options.binaryPath);
  return await Client.create(
    args,
    {
      hostname: options.hostname,
      port: options.debuggerPort,
      remote: !!options.remote,
    },
    browser,
    undefined,
  );
  //}
  // else {
  // const tmpDirName = Deno.makeTempDirSync();
  // const args = getFirefoxArgs(
  //   tmpDirName,
  //   options.debuggerPort,
  //   options.binaryPath,
  // );
  // return await Client.create(
  //   args,
  //   {
  //     hostname: options.hostname,
  //     port: options.debuggerPort,
  //   },
  //   browser,
  //   tmpDirName,
  // );
  //}
}
