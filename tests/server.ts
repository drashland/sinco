import { delay, Drash } from "./deps.ts";

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

class LongWaitingJSResource extends Drash.Resource {
  public paths = ["/long-waiting-js"];

  public GET(_r: Drash.Request, res: Drash.Response) {
    return res.html(`
      <p>hello</p>
      <script>
        document.addEventListener("DOMContentLoaded", async () => {
          document.querySelector('p').textContent = "no"
        })
        for( let i = 0; i < 1000000000; i++) {}
        document.querySelector('p').textContent = "noooo"
      </script>
    `);
  }

  public async POST(_r: Drash.Request, res: Drash.Response) {
    await delay(5000);
    res.text("done");
  }
}

export const server = new Drash.Server({
  resources: [HomeResource, JSResource, PopupsResource, LongWaitingJSResource],
  protocol: "http",
  port: 1447,
  hostname: "localhost",
});
