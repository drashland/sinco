import {Rhum} from "../deps.ts";
import {Dawn} from "../../src/dawn";

const url = "https://chromestatus.com"

Rhum.testPlan("tests/unit/headless_browser_test.ts", () => {
  Rhum.testSuite("constructor()", () => {
    // TODO(any) See todo within
    Rhum.testCase("Creates a headless browser when url is valid", () => { // also accounts for 3 os' when ran in the ci
      //const dawn = new Dawn('https://idontexisthelloworld')
      // TODO(any) Figure out how we can check that the browser process succeeded without closing it (something like `await p.status()`)
    })
    // TODO(any) See todo within
    Rhum.testCase("Fails in creating a browser process when url is invalid", () => {
      //const dawn = new Dawn('https://idontexisthelloworld')
      // TODO(any) Figure out how we can check that the browser process failed without closing it (something like `await p.status()`)
    })
  })
  Rhum.testSuite("click()", () => {
    Rhum.testCase("Throws an error when the element to click is an anchor tag", async () => {
      const dawn = new Dawn(url)
      let errored = false
      try {
        await dawn.click('a[href="/features/schedule"]')
      } catch (err) {
        errored = true
      }
      Rhum.asserts.assertEquals(errored, true)
    })
  })
})

Rhum.run()