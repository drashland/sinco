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

  public GET(r: Drash.Request, res: Drash.Response) {
    return res.html('<a href="https://drash.land" target="_blank" />');
  }
}

export const server = new Drash.Server({
  resources: [HomeResource, JSResource, PopupsResource],
  protocol: "http",
  port: 1447,
  hostname: "localhost",
});
