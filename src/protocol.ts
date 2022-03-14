import { Deferred, deferred } from "../deps.ts";
import { Protocol as ProtocolTypes } from "../deps.ts";

interface MessageResponse { // For when we send an event to get one back, eg running a JS expression
  id: number;
  result?: Record<string, unknown>; // Present on success, OR for example if we  use goTo and the url doesnt exist (in firefox)
  error?: unknown; // Present on error
}

interface NotificationResponse { // Not entirely sure when, but when we send the `Network.enable` method
  method: string;
  params: Record<string, unknown>;
}

type Create<T> = T extends true ? {
  protocol: Protocol;
  frameId: string;
}
  : T extends false ? Protocol
  : never;

export class Protocol {
  /**
   * Our web socket connection to the remote debugging port
   */
  public socket: WebSocket;

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
    Deferred<Record<string, unknown>>
  > = new Map();

  /**
   * Map of notifications, where the key is the method and the value is an array of the events
   */
  public console_errors: string[] = [];

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
    const result = await promise;
    this.#messages.delete(data.id);
    return result;
  }

  #handleSocketMessage(
    message: MessageResponse | NotificationResponse,
  ) {
    if ("id" in message) { // message response
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

      const resolvable = this.notifications.get(message.method);
      if (resolvable) {
        resolvable.resolve(message.params);
      }
    }
  }

  /**
   * A builder for creating an instance of a protocol
   *
   * @param url - The websocket url to connect, which the protocol will use
   *
   * @returns A new protocol instance
   */
  public static async create<T extends boolean = false>(
    url: string,
    getFrameId?: T,
  ): Promise<Create<T>> {
    const p = deferred();
    const socket = new WebSocket(url);
    socket.onopen = () => p.resolve();
    await p;
    const protocol = new Protocol(socket);
    if (getFrameId) {
      protocol.notifications.set("Runtime.executionContextCreated", deferred());
    }
    await protocol.send("Target.getTargets");
    for (const method of ["Page", "Log", "Runtime"]) {
      await protocol.send(`${method}.enable`);
    }
    if (getFrameId) {
      const { context: { auxData: { frameId } } } =
        (await protocol.notifications.get(
          "Runtime.executionContextCreated",
        )) as unknown as ProtocolTypes.Runtime.ExecutionContextCreatedEvent;
      return {
        protocol,
        frameId,
      } as Create<T>;
    }
    return protocol as Create<T>;
  }
}
