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
  {
    hostname = "localhost",
    debuggerPort = 9292,
    binaryPath,
  }: BuildOptions = defaultOptions,
): Promise<{
  browser: Client;
  page: Page;
}> {
  const buildArgs = getChromeArgs(debuggerPort, binaryPath);
  const path = buildArgs.splice(0, 1)[0];
  const command = new Deno.Command(path, {
    args: buildArgs,
    stderr: "piped",
    stdout: "piped",
  });
  const browserProcess = command.spawn();

  return await Client.create(
    {
      hostname,
      port: debuggerPort,
    },
    browserProcess,
  );
}

export async function connect({
  hostname = "localhost",
  debuggerPort = 9292,
}: BuildOptions = defaultOptions) {
  console.log(hostname, debuggerPort);
  return await Client.create(
    {
      hostname,
      port: debuggerPort,
    },
  );
}
