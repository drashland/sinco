import { deferred } from "../deps.ts";

const existsSync = (filename: string): boolean => {
  try {
    Deno.statSync(filename);
    // successful, file or directory must exist
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // file or directory does not exist
      return false;
    } else {
      // unexpected error, maybe permissions, pass it along
      throw error;
    }
  }
};

/**
 * Gets the full path to the chrome executable on the users filesystem
 *
 * @returns The path to chrome
 */
export function getChromePath(): string {
  const paths = {
    // deno-lint-ignore camelcase
    windows_chrome_exe:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    // deno-lint-ignore camelcase
    windows_chrome_exe_x86:
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    linux: "/usr/bin/google-chrome",
  };
  let chromePath = "";
  switch (Deno.build.os) {
    case "darwin":
      chromePath = paths.darwin;
      break;
    case "windows":
      if (existsSync(paths.windows_chrome_exe)) {
        chromePath = paths.windows_chrome_exe;
        break;
      }
      if (existsSync(paths.windows_chrome_exe_x86)) {
        chromePath = paths.windows_chrome_exe_x86;
        break;
      }

      throw new Error(
        "Cannot find path for chrome in Windows. Submit an issue if you encounter this error.",
      );
    case "linux":
      chromePath = paths.linux;
      break;
  }
  return chromePath;
}

export function getChromeArgs(port: number, binaryPath?: string): string[] {
  return [
    binaryPath || getChromePath(),
    "--remote-debugging-port=" + port,
    "--disable-gpu",
    "--headless",
    "--no-sandbox",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-breakpad",
    "--disable-client-side-phishing-detection",
    "--disable-component-extensions-with-background-pages",
    "--disable-default-apps",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-features=TranslateUI",
    "--disable-hang-monitor",
    "--disable-ipc-flooding-protection",
    "--disable-popup-blocking",
    "--disable-prompt-on-repost",
    "--disable-renderer-backgrounding",
    "--disable-sync",
    "--force-color-profile=srgb",
    "--metrics-recording-only",
    "--no-first-run",
    "--enable-automation",
    "--password-store=basic",
    "--use-mock-keychain",
    "about:blank",
  ];
}

export async function waitUntilNetworkIdle() {
  // Logic for waiting until zero network requests have been received for 500ms
  const p = deferred();
  let interval = 0;
  const startInterval = () => {
    interval = setInterval(() => {
      p.resolve();
      clearInterval(interval);
    }, 500);
  };

  // Event listener to restart interval
  const eventListener = () => {
    clearInterval(interval);
    startInterval();
  };

  // On message, restart interval
  addEventListener("message", eventListener);

  // Start the interval and wait
  startInterval();
  await p;

  // Unregister event listener
  removeEventListener("message", eventListener);
}
