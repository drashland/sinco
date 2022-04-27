import { Drash } from "./deps.ts";

class HomeResource extends Drash.Resource {
  public paths = ["/"];
  public GET(_request: Drash.Request, response: Drash.Response) {
    response.html(
      "<script src='index.js'></script><link href='styles.css' rel='stylesheet' />",
    );
  }
}
class JSResource extends Drash.Resource {
  public paths = ["/.*\.js"];
  public GET(_request: Drash.Request, response: Drash.Response) {
    response.text("callUser()");
    response.headers.set("content-type", "application/javascript");
  }
}
class PopupsResource extends Drash.Resource {
  public paths = ["/popups"];

  public GET(_r: Drash.Request, res: Drash.Response) {
    return res.html('<a href="https://drash.land" target="_blank" />');
  }
}

class FileInputResource extends Drash.Resource {
  public paths = ["/file-input"];

  public GET(_r: Drash.Request, res: Drash.Response) {
    return res.html(`
        <p></p>
        <input id="text" type="text" />
        <input type="file" multiple id="multiple-file" />
        <input type="file" id="single-file" />
    `);
  }
}

export const server = new Drash.Server({
  resources: [HomeResource, JSResource, PopupsResource, FileInputResource],
  protocol: "http",
  port: 1447,
  hostname: "localhost",
});
