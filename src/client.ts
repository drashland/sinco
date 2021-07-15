export class Client {
	/**
   * Gets the websocket url we use to create a ws client with.
   * Requires the headless chrome process to be running, as
   * this is what actually starts the remote debugging url
   *
   * @param hostname - The hostname to fetch from
   * @param port -  The port for the hostname to fetch from
   *
   * @returns The url to connect to
   */
  protected static async getWebSocketUrl(hostname: string, port: number) {
    let debugUrl = "";
    while (true) {
      try {
        const res = await fetch(`http://localhost:9293/json/list`);
        const json = await res.json();
        const index = json.length > 1 ? 1 : 0 // chrome will only hold 1 item, whereas firefox will result in 2 items in the array, the 2nd being the one we need
        console.log(json)
        debugUrl = json[index]["webSocketDebuggerUrl"];
        break;
      } catch (_err) {
      	console.log(_err.message)
        // do nothing, loop again until the endpoint is ready
      }
    }
    return debugUrl;
  }
}