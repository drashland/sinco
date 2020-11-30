import {TestsResource} from "./resources/tests_resource.ts";
import {RunResource} from "./resources/run_resource.ts";
import {Drash} from "../deps.ts";
import { socket } from "./socket.ts";

await socket.run({
  hostname: "localhost",
  port: 64943
})

console.log('socket running')

const server = new Drash.Http.Server({
  resources: [
    TestsResource,
    RunResource,
  ]
})

await server.run({
    hostname: "localhost",
    port: 64942
  })
  console.log('server running')