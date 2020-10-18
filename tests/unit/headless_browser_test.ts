import {Rhum} from "../deps.ts";
import {Dawn} from "../../mod.ts";

Rhum.testPlan("tests/integration/headless_browser_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    Rhum.testCase("The headless browser sub process should be running", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      const res = await fetch("http://localhost:9292")
      await dawn.done()
      Rhum.asserts.assertEquals(res.status, 200)
    })
  })
  Rhum.testSuite("start()", () => {
    Rhum.testCase("Should create and start the web socket", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      await dawn.start()
      await dawn.done()
      Rhum.asserts.assertEquals(dawn.connected, true)
    })
  })
  Rhum.testSuite("click()", () => {
    Rhum.testCase("It should allow clicking of elements", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      await dawn.start()
      await dawn.click('a[href="/features/schedule"]')
      await dawn.assertSee("Release timeline")
      await dawn.done()
    })
    Rhum.testCase("It should throw an error when there is a syntax error", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      await dawn.start()
      Rhum.asserts.assertThrows(async () => {
        await dawn.click("q;q")
        await dawn.done()
      })
    })
    Rhum.testCase("It should throw an error when no element exists for the selector", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      await dawn.start()
      Rhum.asserts.assertThrows(async () => {
        await dawn.click("a#dont-exist")
        await dawn.done()
      })
    })
  })
  Rhum.testSuite("getInputValue()", () => {
    Rhum.testCase("It should get the value for the given input element", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      await dawn.start()
      await dawn.type('input[placeholder="Filter"]', "hello world")
      const val = await dawn.getInputValue('input[placeholder="Filter"]')
      Rhum.asserts.assertEquals(val, "hello world")
      await dawn.done()
    })
    Rhum.testCase("It should throw an error when there is a syntax error", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      await dawn.start()
      Rhum.asserts.assertThrows(async () => {
        await dawn.getInputValue("q;q")
        await dawn.done()
      })
    })
    Rhum.testCase("It should throw an error when no element exists for the selector", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      await dawn.start()
      Rhum.asserts.assertThrows(async () => {
        await dawn.getInputValue('input[name="dontexist"]')
        await dawn.done()
      })
    })
    Rhum.testCase("Should return undefined when element is not an input element", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      await dawn.start()
      const val = await dawn.getInputValue('input[name="dontexist"]')
      Rhum.asserts.assertEquals(val, undefined)
      await dawn.done()
    })
  })
  Rhum.testSuite("waitForAjax()", () => {
    Rhum.testCase("It should wait for a long running ajax process to finish", async () => {

    })
  })
  Rhum.testSuite("type()", () => {
    Rhum.testCase("It should set the value of the element", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      await dawn.start()
      await dawn.type('input[placeholder="Filter"]', "hello world")
      const val = await dawn.getInputValue('input[placeholder="Filter"]')
      Rhum.asserts.assertEquals(val, "hello world")
    })
    Rhum.testCase("It should throw an error when there is a syntax error", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      await dawn.start()
      Rhum.asserts.assertThrows(async () => {
        await dawn.type("q;q")
        await dawn.done()
      })
    })
    Rhum.testCase("It should throw an error when no element exists for the selector", async () => {
      const dawn = new Dawn("https://chromestatus.com")
      await dawn.start()
      Rhum.asserts.assertThrows(async () => {
        await dawn.type("input#dont-exist")
        await dawn.done()
      })
    })
  })
})

Rhum.run()