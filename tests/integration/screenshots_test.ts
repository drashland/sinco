import { ChromeClient, FirefoxClient } from "../../mod.ts";

Deno.test("Chrome - Tutorial for taking screenshots in the docs should work", async () => {
  const ScreenshotsFolder = "ScreenshotsInteg";
  try {
    Deno.removeSync(ScreenshotsFolder, { recursive: true });
  } catch (_e) {
    //
  } finally {
    Deno.mkdirSync(ScreenshotsFolder);
  }
  const Sinco = await ChromeClient.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.takeScreenshot(ScreenshotsFolder);
  await Sinco.takeScreenshot(ScreenshotsFolder, {
    fileName: "FirstSpanChrome",
    selector: "span",
    format: "png",
  });
  await Sinco.done();
});

Deno.test("Firefox - Tutorial for taking screenshots in the docs should work", async () => {
  const ScreenshotsFolder = "ScreenshotsInteg";
  try {
    Deno.removeSync(ScreenshotsFolder, { recursive: true });
  } catch (_e) {
    //
  } finally {
    Deno.mkdirSync(ScreenshotsFolder);
  }
  const Sinco = await FirefoxClient.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.takeScreenshot(ScreenshotsFolder);
  await Sinco.takeScreenshot(ScreenshotsFolder, {
    fileName: "FirstSpanFirefox",
    selector: "span",
    format: "png",
  });
  await Sinco.done();
});
