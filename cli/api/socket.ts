import { Server, Packet } from "https://deno.land/x/wocket/mod.ts"
import {readLines} from "../../deps.ts";

export const socket = new Server()

// Open channels
socket.on("test-success", (data: Packet) => {})
socket.on("test-failure", (data: Packet) => {})

async function processStderr (p: Deno.Process) {
  for await (const line of readLines(p.stderr!)) {
    // TODO
  }
}

async function processStdout (p: Deno.Process) {
  for await (const line of readLines(p.stdout!)) {
    if (line.indexOf("test") === 0 && line.indexOf(" ... ") > -1) {
      const testName = line.split("test ")[1].split(" ... ok")[0]
      socket.to("test-success", {
        testName,
        testCase: true,
        testFinished: false,
        testResult: null
      })
    }
    if (line.indexOf("test result: ") > -1) {
      const testResult = line.split("test result: ok. ")[0].split(";")
      const passed =  testResult[0].split(" passed")[0]
      const failed = testResult[1].split(" failed")[0]
      socket.to("test-success", {
        testName: "",
        testCase: false,
        testFinished: true,
        testResult: {
          passed,
          failed
        }
      })
    }
  }
}

export function processTestOutput (p: Deno.Process) {
  processStderr(p)
  processStdout(p)
}
