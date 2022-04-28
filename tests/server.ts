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

class DialogsResource extends Drash.Resource {
  public paths = ["/dialogs"];

  public GET(_r: Drash.Request, res: Drash.Response) {
    return res.html(`
      <button type="button" id="button">Click</button>
      <script>
        document.querySelector('#button').addEventListener('click', e => {
          const value = prompt("some text");
          e.target.textContent = value;
        })
      </script>
    `);
  }
}

export const server = new Drash.Server({
  resources: [HomeResource, JSResource, PopupsResource, DialogsResource],
  protocol: "http",
  port: 1447,
  hostname: "localhost",
});
