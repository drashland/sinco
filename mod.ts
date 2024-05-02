import { Client } from "./src/client.ts";
import { BuildOptions, Cookie, ScreenshotOptions } from "./src/interfaces.ts";
import { Page } from "./src/page.ts";

export type { BuildOptions, Cookie, ScreenshotOptions };

export async function build(
  options: BuildOptions = {
    hostname: "localhost",
    debuggerPort: 9292,
    binaryPath: undefined,
  },
): Promise<{
  browser: Client;
  page: Page;
}> {
  if (!options.debuggerPort) options.debuggerPort = 9292;
  if (!options.hostname) options.hostname = "localhost";
  return await Client.create(
    {
      hostname: options.hostname,
      port: options.debuggerPort,
    },
  );
}
