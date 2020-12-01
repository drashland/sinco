import {Webview, walkSync} from "../deps.ts";
import {closeServers, startWebAndSocketServer} from "../api/app.ts";

export function getProjectName (): string {
  const cwd = Deno.cwd();
  const parts = cwd.split("/")
  const dirName = parts[parts.length - 1]
  return dirName
}

// eg if we have tests/browser/pages/home_page_test.ts: { pages: ["home_page_test.ts"] }
export function constructTestFilesList (): {[key: string]: string[]} {
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
  console.log("INFO Starting up.. this may take a few seconds.")

  // get server ready to handle requests from the gui
  await startWebAndSocketServer()

  // Create and open GUI
  const projectName = getProjectName()
  let html = new TextDecoder().decode(Deno.readFileSync("./cli/index.html"))
  html = html
      .replace("{{ projectName }}", projectName)
      .replace("{{ testFiles }}", encodeURIComponent(JSON.stringify(constructTestFilesList())))
  const webView = new Webview({
    title: projectName,
    url: `data:text/html,${encodeURIComponent(html)}`,
    height: 650,
    width: 1120,
    resizable: true,
    debug: true,
    frameless: false,
  })
  await webView.run();

  // Reaches here when window is closed, so do a cleanup
  await closeServers()
}