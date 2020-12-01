import {Webview, walkSync} from "../deps.ts";
import {closeServers, startWebAndSocketServer} from "../api/app.ts";
import {constructTestFilesList, getProjectName} from "../utils.ts";

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