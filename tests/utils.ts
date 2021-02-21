import { ChromeClient, FirefoxClient } from "../mod.ts";

export const Clients = [
  await ChromeClient.build(),
  await FirefoxClient.build(),
];
