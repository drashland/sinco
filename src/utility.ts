export const existsSync = (filename: string): boolean => {
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

export const generateTimestamp = (): string => {
  const dt = new Date();
  const ts = dt.toLocaleDateString().replace(/\//g, "_") + "_" +
    dt.toLocaleTimeString().replace(/:/g, "_");
  return ts;
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
    "--enable-features=NetworkService,NetworkServiceInProcess",
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

/**
 * Get full path to the firefox binary on the user'ss filesystem.
 * Thanks to [caspervonb](https://github.com/caspervonb/deno-web/blob/master/browser.ts)
 *
 * @returns the path
 */
export function getFirefoxPath(): string {
  switch (Deno.build.os) {
    case "darwin":
      return "/Applications/Firefox.app/Contents/MacOS/firefox";
    case "linux":
      return "/usr/bin/firefox";
    case "windows":
      return "C:\\Program Files\\Mozilla Firefox\\firefox.exe";
    default:
      throw new Error("Unhandled OS. Unsupported for " + Deno.build.os);
  }
}

export function getFirefoxArgs(
  tmpDirName: string,
  port: number,
  binaryPath?: string,
): string[] {
  return [
    binaryPath || getFirefoxPath(),
    "--remote-debugging-port",
    port.toString(),
    "-profile",
    tmpDirName,
    "-headless",
    "-url",
    "about:blank",
  ];
}
