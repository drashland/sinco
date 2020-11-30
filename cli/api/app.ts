import {TestsResource} from "./resources/tests_resource.ts";
import {RunResource} from "./resources/run_resource.ts";
import {Drash} from "../deps.ts";

const server = new Drash.Http.Server({
  resources: [
    TestsResource,
    RunResource
  ]
})

await server.run({
    hostname: "localhost",
    port: 1668
  })
  console.log('server running')