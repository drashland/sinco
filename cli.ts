/**
 * deno run --unstable --allow-env --allow-read --allow-write --allow-net --allow-plugin
 */
import {walkSync, WebView} from "./cli/deps.ts";

//
// CONSTRUCT DATA
//

const args = Deno.args;
const projectName = (function () {
  const cwd = Deno.cwd();
  const parts = cwd.split("/")
  const dirName = parts[parts.length - 1]
  return dirName
})();
const rootTestDir = "./tests/browser";
const allTestFiles: { // eg if we have tests/browser/pages/home_page_test.ts: { pages: ["home_page_test.ts"] }
  [key: string]: string[]
} = (function () {
  const result: {
    [key: string]: Array<string>
  } = {}
  let subDirWeAreIn = "";
  for (const entry of walkSync(rootTestDir)) {
    // Ignore trying to add `tests/browser`
    if (entry.path === "tests/browser") {
      continue
    }

    // If we have reached a dir, create a new key
    if (entry.isDirectory === true) {
      result[entry.name] = []
      subDirWeAreIn = entry.name
      continue
    }

    // If we have reached a file, add it to the dir (key) it's under
    if (entry.isFile === true) {
      result[subDirWeAreIn].push(entry.name)
    }
  }
  return result
})()

async function startCommand (): Promise<void> {
  // TODO :: Wait until the server is finished. Maybe do `for await (const line of Readlines(p.stdout) { if (line === "server running") break }`?
  // We do a subprocess here because for some reason, if we try run the server normally, requests to the api just hang.. INVESTIGATE
  Deno.run({
    cmd: ["deno", "run", "-A", "--unstable", "cli/api/app.ts"]
  })
  const testSectionForSidebar: string = (function () {
    let str = "<li>"
    Object.keys(allTestFiles).forEach(subDirName => {
      str += "<p class='menu-header-main-item'>" + subDirName + "</p><ul>"
      allTestFiles[subDirName].forEach(fileName => {
        str += "<li><p class='menu-header-sub-item'>" + fileName + "</p></li>"
      })
      str += "</ul></li>"
    })
    return str
  })()
  let html = new TextDecoder().decode(Deno.readFileSync("./cli/index.html"))
  html = html
      .replace("{{ projectName }}", projectName)
      .replace("{{ testSectionForSidebar }}", testSectionForSidebar)
  await new WebView({
    title: projectName,
    url: `data:text/html,${encodeURIComponent(html)}`,
    height: 650,
    width: 1120,
    resizable: true,
    debug: true,
    frameless: false,
  }).run();
}

//
// ENTRY POINT
//

if (args[0] === "start") {
  startCommand()
}