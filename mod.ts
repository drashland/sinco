import { Client } from "./src/client.ts";
import { BuildOptions, Cookie, ScreenshotOptions } from "./src/interfaces.ts";
import { Page } from "./src/page.ts";
import { getChromeArgs } from "./src/utility.ts";

export type { BuildOptions, Cookie, ScreenshotOptions };

const defaultOptions = {
  hostname: "localhost",
  debuggerPort: 9292,
  binaryPath: undefined,
};

export async function build(
  options: BuildOptions = defaultOptions,
): Promise<{
  browser: Client;
  page: Page;
}> {
  if (!options.debuggerPort) options.debuggerPort = 9292;
  if (!options.hostname) options.hostname = "localhost";
  const buildArgs = getChromeArgs(options.debuggerPort);
  const path = buildArgs.splice(0, 1)[0];
  const command = new Deno.Command(path, {
    args: buildArgs,
    stderr: "piped",
    stdout: "piped",
  });
  const browserProcess = command.spawn();

  return await Client.create(
    {
      hostname: options.hostname,
      port: options.debuggerPort,
    },
    browserProcess,
  );
}

export async function connect(options: BuildOptions = defaultOptions) {
  if (!options.debuggerPort) options.debuggerPort = 9292;
  if (!options.hostname) options.hostname = "localhost";

  return await Client.create(
    {
      hostname: options.hostname,
      port: options.debuggerPort,
    },
  );
}
