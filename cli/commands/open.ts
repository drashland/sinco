import {WebView, walkSync} from "../deps.ts";
import {readLines} from "../../deps.ts";

function getProjectName (): string {
  const cwd = Deno.cwd();
  const parts = cwd.split("/")
  const dirName = parts[parts.length - 1]
  return dirName
}

async function startWebApp () {
  const p = Deno.run({
    cmd: ["deno", "run", "-A", "--unstable", "cli/api/app.ts"],
    stdout: "piped"
  })
  for await (const line of readLines(p.stdout)) {
    if (line === "server running") {
      break
    }
  }
}

// eg if we have tests/browser/pages/home_page_test.ts: { pages: ["home_page_test.ts"] }
function constructTestFilesList (): {[key: string]: string[]} {
  const result: {
    [key: string]: Array<string>
  } = {}
  let subDirWeAreIn = "";
  for (const entry of walkSync("./tests/browser")) {
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
}

export async function open (): Promise<void> {
  // We do a subprocess here because for some reason, if we try run the server normally, requests to the api just hang.. INVESTIGATE
  await startWebApp()
  const testSectionForSidebar: string = (function () {
    const allTestFiles = constructTestFilesList()
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
  const projectName = getProjectName()
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