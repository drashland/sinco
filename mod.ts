import { Client } from "./src/client.ts";
import { BuildOptions, Cookie, ScreenshotOptions } from "./src/interfaces.ts";
import type { Browsers } from "./src/types.ts";
import { getChromeArgs, getFirefoxArgs } from "./src/utility.ts";

export type { BuildOptions, Cookie, ScreenshotOptions };

export async function buildFor(
  browser: Browsers,
  options: BuildOptions = {
    hostname: "localhost",
    debuggerPort: 9292,
    binaryPath: undefined,
  },
): Promise<Client> {
  if (!options.debuggerPort) options.debuggerPort = 9292;
  if (!options.hostname) options.hostname = "localhost";
  if (browser === "chrome") {
    const args = getChromeArgs(options.debuggerPort, options.binaryPath);
    return await Client.create(
      args,
      {
        hostname: options.hostname,
        port: options.debuggerPort,
      },
      browser,
      undefined,
    );
  } else {
    const tmpDirName = Deno.makeTempDirSync();
    const args = getFirefoxArgs(
      tmpDirName,
      options.debuggerPort,
      options.binaryPath,
    );
    return await Client.create(
      args,
      {
        hostname: options.hostname,
        port: options.debuggerPort,
      },
      browser,
      tmpDirName,
    );
  }
}
