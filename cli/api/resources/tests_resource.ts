import {Drash} from "../../deps.ts";
import {constructTestFilesList, getProjectName} from "../../commands/open.ts";

export class TestsResource extends Drash.Http.Resource {
  static paths = ["/tests"]

  public GET () {
    const dir = this.request.getUrlQueryParam("dir") || ""
    const filename = this.request.getUrlQueryParam("filename") || ""
    const projectName  = getProjectName()
    let content = new TextDecoder().decode(Deno.readFileSync("./cli/api/views/index.html"))
    const allTestFiles = constructTestFilesList();
    const testFiles = {
      [dir]: filename ? [filename] : [...allTestFiles[dir]]
    }
    content = content
        .replace("{{ dir }}", dir)
        .replace("{{ filename }}", filename)
        .replace("{{ projectName }}", projectName)
        .replace("{{ testFiles }}", encodeURIComponent(JSON.stringify(testFiles)))
    this.response.body = content
    return this.response
  }

  public async POST () {
    const dir = this.request.getUrlQueryParam("dir") || ""
    const filename = this.request.getUrlQueryParam("filename") || ""
    const pathToTest = "tests/browser/" + dir + (filename ? "/" + filename : "")
    const p  = Deno.run({
      cmd: ["deno", "test", "-A", pathToTest]
    })
    let debugUrl = "";
    let count = 0
    while (true) {
      count++
      try {
        const headlessRes = await fetch("http://localhost:9292/json/list")
        const jsonRes = await headlessRes.json()
        debugUrl = "http://localhost:9292" + jsonRes[0]["devtoolsFrontendUrl"]
        break
      } catch (err) {

      }
      if (count > 1000) {
        break
      }
    }
    this.response.body = {
      dir: dir,
      filename,
      debugUrl
    }
    return this.response
  }
}