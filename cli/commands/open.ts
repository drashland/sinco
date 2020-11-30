import {WebView, walkSync} from "../deps.ts";
import {readLines} from "../../deps.ts";

export function getProjectName (): string {
  const cwd = Deno.cwd();
  const parts = cwd.split("/")
  const dirName = parts[parts.length - 1]
  return dirName
}

async function startWebApp () {
  const p = Deno.run({
    cmd: ["deno", "run", "-A", "--unstable", "cli/api/app.ts"],
    //stdout: "piped"
  })
  // for await (const line of readLines(p.stdout)) {
  //   if (line === "server running") {
  //     break
  //   }
  // }
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
  // We do a subprocess here because for some reason, if we try run the server normally, requests to the api just hang.. INVESTIGATE
  await startWebApp()
  const projectName = getProjectName()
  let html = new TextDecoder().decode(Deno.readFileSync("./cli/index.html"))
  html = html
      .replace("{{ projectName }}", projectName)
      .replace("{{ testFiles }}", encodeURIComponent(JSON.stringify(constructTestFilesList())))
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