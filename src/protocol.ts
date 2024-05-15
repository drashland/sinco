import { Deferred, deferred } from "../deps.ts";

interface MessageResponse { // For when we send an event to get one back, eg running a JS expression
  id: number;
  result?: Record<string, unknown>; // Present on success, OR for example if we  use goTo and the url doesnt exist (in firefox)
  error?: unknown; // Present on error
}

interface NotificationResponse { // Not entirely sure when, but when we send the `Network.enable` method
  method: string;
  params: Record<string, unknown>;
}

export class Protocol {
  /**
   * Our web socket connection to the remote debugging port
   */
  protected socket: WebSocket;

  /**
   * A counter that acts as the message id we use to send as part of the event data through the websocket
   */
  #next_message_id = 1;

  /**
   * To keep hold of our promises waiting for messages from the websocket
   */
  #messages: Map<number, Deferred<unknown>> = new Map();

  /**
   * To keep hold of promises waiting for a notification from the websocket
   */
  public notifications: Map<
    string,
    Deferred<Record<string, unknown>> | {
      params: Record<string, unknown>;
      promise: Deferred<Record<string, unknown>>;
    }
  > = new Map();

  constructor(
    socket: WebSocket,
  ) {
    this.socket = socket;
    // Register on message listener
    this.socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      this.#handleSocketMessage(data);
    };
  }

  /**
   * Main method to handle sending messages/events to the websocket endpoint.
   *
   * @param method - Any DOMAIN, see sidebar at https://chromedevtools.github.io/devtools-protocol/tot/, eg Runtime.evaluate, or DOM.getDocument
   * @param params - Parameters required for the domain method
   *
   * @returns
   */
  public async send<RequestType, ResponseType>(
    method: string,
    params?: RequestType,
  ): Promise<ResponseType> {
    const data: {
      id: number;
      method: string;
      params?: RequestType;
    } = {
      id: this.#next_message_id++,
      method: method,
    };
    if (params) data.params = params;
    const promise = deferred<ResponseType>();
    this.#messages.set(data.id, promise);
    this.socket.send(JSON.stringify(data));

    let count = 0;
    const maxDuration = 30;
    const intervalId = setInterval(() => {
      count++;
      if (count === maxDuration) {
        const event = new CustomEvent("timeout", {
          detail: "Timed out as action took longer than 30s.",
        });
        dispatchEvent(event);
        clearInterval(intervalId);
      }
    }, 1000);

    const result = await promise;
    clearInterval(intervalId);
    this.#messages.delete(data.id);
    return result;
  }

  #handleSocketMessage(
    message: MessageResponse | NotificationResponse,
  ) {
    if ("id" in message) { // message response
      // TODO :: make it unique eg `<frame-id>.message` so say another page instance wont pick up events for the wrong websocket
      dispatchEvent(new CustomEvent("message", { detail: message }));

      const resolvable = this.#messages.get(message.id);
      if (!resolvable) {
        return;
      }
      if ("result" in message) { // success response
        resolvable.resolve(message.result);
      }
      if ("error" in message) { // error response
        resolvable.resolve(message.error);
      }
    }
    if ("method" in message) { // Notification response
      dispatchEvent(
        new CustomEvent(message.method, {
          detail: message.params,
        }),
      );

      const resolvable = this.notifications.get(message.method);
      if (!resolvable) {
        return;
      }
      if ("resolve" in resolvable && "reject" in resolvable) {
        resolvable.resolve(message.params);
      }
      if ("params" in resolvable && "promise" in resolvable) {
        let allMatch = false;
        Object.keys(resolvable.params).forEach((paramName) => {
          if (
            allMatch === true &&
            (message.params[paramName] as string | number).toString() !==
              (resolvable.params[paramName] as string | number).toString()
          ) {
            allMatch = false;
            return;
          }
          if (
            (message.params[paramName] as string | number).toString() ===
              (resolvable.params[paramName] as string | number).toString()
          ) {
            allMatch = true;
          }
        });
        if (allMatch) {
          resolvable.promise.resolve(message.params);
        }
        return;
      }
    }
  }
}
