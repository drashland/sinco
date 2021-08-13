import { ChromeClient, FirefoxClient } from "../../mod.ts";
const ScreenshotsFolder =
  ((Deno.build.os == "windows") ? "ScreenshotsInteg" : "./ScreenshotsInteg");

try {
  Deno.removeSync(ScreenshotsFolder, { recursive: true });
} catch (_e) {
  //
} finally {
  Deno.mkdirSync(ScreenshotsFolder);
}

Deno.test("Chrome - Tutorial for taking screenshots in the docs should work", async () => {
  const Sinco = await ChromeClient.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.takeScreenshot(ScreenshotsFolder);
  await Sinco.takeScreenshot(ScreenshotsFolder, {
    fileName: "FirstSpanChrome",
    selector: "span",
    format: "webp",
  });
  await Sinco.done();
});

Deno.test("Firefox - Tutorial for taking screenshots in the docs should work", async () => {
  const Sinco = await FirefoxClient.build();
  await Sinco.goTo("https://chromestatus.com");
  await Sinco.takeScreenshot(ScreenshotsFolder);
  await Sinco.takeScreenshot(ScreenshotsFolder, {
    fileName: "FirstSpanFirefox",
    selector: "span",
    format: "webp",
  });
  await Sinco.done();
  Deno.removeSync(ScreenshotsFolder, { recursive: true });
});
