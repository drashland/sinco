import { iter as iterator } from "../deps.ts";

/**
 * Prerequisites
 *
 * 1. Create a test profile:
 *
 *    // /tmp/firefox_dev_profile/prefs.js
 *    user_pref("devtools.chrome.enabled", true);
 *    user_pref("devtools.debugger.prompt-connection", false);
 *    user_pref("devtools.debugger.remote-enabled", true);
 *
 * 2. Create headless browser:
 *
 *    /Applications/Firefox.app/Contents/MacOS/firefox --start-debugger-server 9293 --profile /tmp/firefox_dev_profile https://chromestatus.com
 */

interface Tab {
  actor: string; // eg "server1.conn18.tabDescriptor1",
  browserContextID: number;
  isZombieTab: boolean;
  outerWindowId: number;
  selected: true; // If this is the web page we are viewing
  title: string; // Title of the web page
  traits: {
    isBrowsingContext: true;
  };
  url: string; // eg "https://chromestatus.com/features"
  consoleActor: string;
  inspectorActor: string;
  styleSheetsActor: string;
  storageActor: string;
  memoryActor: string;
  framerateActor: string;
  reflowActor: string;
  cssPropertiesActor: string;
  performanceActor: string;
  animationsActor: string;
  responsiveActor: string;
  contentViewerActor: string;
  webExtensionInspectedWindowActor: string;
  accessibilityActor: string;
  screenshotActor: string;
  changesActor: string;
  webSocketActor: string;
  eventSourceActor: string;
  manifestActor: string;
  networkContentActor: string;
}

interface ListTabsResponse {
  tabs: Array<Tab>;
}

// deno-lint-ignore no-unused-vars
async function simplifiedFirefoxExample() {
  async function connect(): Promise<Deno.Conn> {
    const conn = await Deno.connect({
      hostname: "0.0.0.0", // we are running headless on host machine, so the ip/host of your machine
      port: 9293, // port we started the debugger on
    });
    return conn;
  }

  const conn = await connect();
  const iter = iterator(conn);
  await iter.next(); // get 'welcome' message out the way

  async function request(type: string, params = {}, name: string): Promise<{
    id: number;
    // because we return a packet
    // deno-lint-ignore no-explicit-any
    message: Record<string, any>;
  }> {
    // Construct data in required format to send
    const message = {
      type,
      to: name,
      ...params,
    };
    const str = JSON.stringify(message);
    const encoder = new TextEncoder();
    const encodedMessage = `${(encoder.encode(str)).length}:${str}`;
    // Send message
    await conn.write(new TextEncoder().encode(encodedMessage));
    // Receive the response
    const result = await iter.next();
    const value = result.value;
    const decodedValue = new TextDecoder().decode(value); // eg `decodedValue` = `123: { ... }` or `92: { ... }`
    const colonIndex = decodedValue.indexOf(":");
    const id = Number(decodedValue.substr(0, colonIndex));
    const jsonString = decodedValue.substr(colonIndex + 1);
    const parsedJson = JSON.parse(jsonString);
    return {
      id,
      message: parsedJson,
    };
  }

  // Majority of this code was taken from https://github.com/saucelabs/foxdriver/blob/1f75618f5f815b6d2022117187db1e2ac711c4db/lib/browser.js#L76. Thank you!
  async function listTabs(): Promise<Array<Tab>> {
    let listTabsResponse = (await request("listTabs", {}, "root"))
      .message as ListTabsResponse;
    // NOTE: When browser isn't ran in headless, there is usually 2 tabs open, the first one being "Advanced Preferences" or "about" page, and the second one being the actual page we navigated to
    if (!listTabsResponse.tabs) {
      // Sometimes the browser is failing to retrieve the list of tabs, this is a retry
      listTabsResponse = (await request("listTabs", {}, "root"))
        .message as ListTabsResponse;
    }
    /**
     * For firefox > 75 consoleActor is not available within listTabs request
     */
    if (
      listTabsResponse.tabs.length && !listTabsResponse.tabs[0].consoleActor
    ) {
      const tabActorsRequests = listTabsResponse.tabs.map(({ actor }) => {
        return request("getTarget", {}, actor);
      });
      const tabActors = await Promise.all(tabActorsRequests);
      const tabs = listTabsResponse.tabs.map((tab, index) => ({
        ...tab,
        ...(tabActors[index] ? tabActors[index].message.frame : null),
      }));
      listTabsResponse.tabs = tabs;
    }
    return listTabsResponse.tabs;
  }

  const tabs = await listTabs();
  console.log(tabs);
  const a = await request(
    "navigateTo",
    { url: "https://chromestatus.com" },
    tabs[1].actor,
  );
  console.log(a);
}
