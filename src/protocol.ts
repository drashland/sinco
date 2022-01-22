import { Deferred, deferred } from "../deps.ts";
import { Protocol as ProtocolTypes } from "../deps.ts";
import { Client } from "./client.ts";

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
  public socket: WebSocket;

  /**
   * All domains that a ws client should listen on for events
   */
  public static initial_event_method_listeners = [
    'Page',
    'Target',
    'Log',
    'Runtime',
  ];

  /**
   * A counter that acts as the message id we use to send as part of the event data through the websocket
   */
  #next_message_id = 1;

  /**
   * To keep hold of our promises waiting for messages from the websocket
   */
  #resolvables: Map<number, Deferred<unknown>> = new Map();

  /**
   * To keep hold of promises waiting for a notification from the websocket
   */
  public notification_resolvables: Map<
    string,
    Deferred<Record<string, unknown>>
  > = new Map();

  /**
   * Map of notifications, where the key is the method and the value is an array of the events
   */
  public console_errors: string[] = [];

  client?: Client;

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
  public async sendWebSocketMessage<RequestType, ResponseType>(
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
    this.#resolvables.set(data.id, promise);
    this.socket.send(JSON.stringify(data));
    const result = await promise;
    this.#resolvables.delete(data.id);
    return result;
  }

  #handleSocketMessage(
    message: MessageResponse | NotificationResponse,
  ) {
    if ("id" in message) { // message response
      const resolvable = this.#resolvables.get(message.id);
      if (!resolvable) {
        return;
      }
      if ("result" in message) { // success response
        // TODO :: Why do we have this? should be in checkForErrorresult or something
        if ("errorText" in message.result!) {
          const r = this.notification_resolvables.get("Page.loadEventFired");
          if (r) {
            r.resolve();
          }
        }
        resolvable.resolve(message.result);
      }
      if ("error" in message) { // error response
        resolvable.resolve(message.error);
      }
    }
    if ("method" in message) { // Notification response
      console.log("got notification", message);
      // Store certain methods for if we need to query them later
      if (message.method === "Runtime.exceptionThrown") {
        const params = message
          .params as unknown as ProtocolTypes.Runtime.ExceptionThrownEvent;
        const errorMessage = params.exceptionDetails.exception?.description ??
          params.exceptionDetails.text;
        if (errorMessage) {
          this.console_errors.push(errorMessage);
        }
      }
      if (message.method === "Log.entryAdded") {
        const params = message
          .params as unknown as ProtocolTypes.Log.EntryAddedEvent;
        if (params.entry.level === "error") {
          const errorMessage = params.entry.text;
          if (errorMessage) {
            this.console_errors.push(errorMessage);
          }
        }
      }

      const resolvable = this.notification_resolvables.get(message.method);
      if (resolvable) {
        resolvable.resolve(message.params);
      }
    }
  }
}
