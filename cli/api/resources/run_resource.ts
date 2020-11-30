import {Drash} from "../../deps.ts";

export class RunResource extends Drash.Http.Resource {
  static paths = ["/run"]

  /**
   * Requires url query parameters:
   *
   *   - `dir`, the directory, eg if test file path is `tests/browser/pages/test_file.ts`, then `dir` is `pages`
   *   - `filename`, just the filename to run
   */
  public GET () {
    const dir = "pages" //this.request.getUrlQueryParam("dir") || "" TODO BROKEN, it's the filename and not the dir
    const filename = this.request.getUrlQueryParam("filename") || ""
    Deno.run({
      cmd: ["open", "-na", "Google Chrome", "--args", "--new-window", "http://localhost:1668/tests?dir=" + dir + "&filename=" + filename]
    })
  }
}