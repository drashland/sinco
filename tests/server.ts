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

class WaitForRequestsResource extends Drash.Resource {
  public paths = ["/wait-for-requests"];

  public GET(_r: Drash.Request, res: Drash.Response) {
    return res.html(`
      <form action="/wait-for-requests" method="POST">
        <button type="submit">Click</button>
      </form>
      <button id="second-button" type="button">Click</button>
      <script>
        document.getElementById("second-button").addEventListener('click', async e => {
          await fetch("/wait-for-requests", {
            method: "POST",
          })
          e.target.textContent = "done";
        })
      </script>
    `);
  }

  public async POST(_r: Drash.Request, res: Drash.Response) {
    await delay(2000);
    return res.text("Done!!");
  }
}

export const server = new Drash.Server({
  resources: [
    HomeResource,
    JSResource,
    PopupsResource,
    WaitForRequestsResource,
  ],
  protocol: "http",
  port: 1447,
  hostname: "localhost",
});
