import { Rhum, Rhum2 } from "../deps.ts";
import { Cinco } from "../../mod.ts";

Rhum2.testPlan(() => {
  Rhum2.testSuite("click()", () => {
    Rhum2.testCase("It should allow clicking of elements", async () => {
      const cinco = new Cinco("https://chromestatus.com");
      await cinco.start();
      await cinco.click('a[href="/features/schedule"]');
      await cinco.assertSee("Release timeline");
      await cinco.done();
    });
    Rhum2.testCase(
      "It should throw an error when there is a syntax error",
      async () => {
        const cinco = new Cinco("https://chromestatus.com");
        await cinco.start();
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await cinco.click("q;q");
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await cinco.done();
        Rhum2.asserts.assertEquals(error, {
          errored: true,
          msg:
            "DOMException: Failed to execute 'querySelector' on 'Document': 'q;q' is not a valid selector.\n    at <anonymous>:1:10: \"document.querySelector('q;q').click()\"",
        });
      },
    );
    Rhum2.testCase(
      "It should throw an error when no element exists for the selector",
      async () => {
        const cinco = new Cinco("https://chromestatus.com");
        await cinco.start();
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await cinco.click("a#dont-exist");
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await cinco.done();
        Rhum2.asserts.assertEquals(error, {
          errored: true,
          msg:
            `TypeError: Cannot read property 'click' of null\n    at <anonymous>:1:39: "document.querySelector('a#dont-exist').click()"`,
        });
      },
    );
  });
  Rhum2.testSuite("getInputValue()", () => {
    Rhum2.testCase(
      "It should get the value for the given input element",
      async () => {
        const cinco = new Cinco("https://chromestatus.com");
        await cinco.start();
        await cinco.type('input[placeholder="Filter"]', "hello world");
        const val = await cinco.getInputValue('input[placeholder="Filter"]');
        Rhum2.asserts.assertEquals(val, "hello world");
        await cinco.done();
      },
    );
    Rhum2.testCase(
      "It should throw an error when there is a syntax error",
      async () => {
        const cinco = new Cinco("https://chromestatus.com");
        await cinco.start();
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await cinco.getInputValue("q;q");
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await cinco.done();
        Rhum2.asserts.assertEquals(error, {
          errored: true,
          msg:
            `DOMException: Failed to execute 'querySelector' on 'Document': 'q;q' is not a valid selector.\n    at <anonymous>:1:10: "document.querySelector('q;q').value"`,
        });
      },
    );
    Rhum2.testCase(
      "It should throw an error when no element exists for the selector",
      async () => {
        const cinco = new Cinco("https://chromestatus.com");
        await cinco.start();
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await cinco.getInputValue('input[name="dontexist"]');
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await cinco.done();
        Rhum2.asserts.assertEquals(error, {
          errored: true,
          msg:
            `TypeError: Cannot read property 'value' of null\n    at <anonymous>:1:50: "document.querySelector('input[name="dontexist"]').value"`,
        });
      },
    );
    Rhum2.testCase(
      "Should return undefined when element is not an input element",
      async () => {
        const cinco = new Cinco("https://chromestatus.com");
        await cinco.start();
        const val = await cinco.getInputValue('a[href="/features/schedule"]');
        await cinco.done();
        Rhum2.asserts.assertEquals(val, "undefined");
      },
    );
  });
  Rhum2.testSuite("waitForAjax()", () => {
    Rhum2.testCase(
      "It should wait for a long running ajax process to finish",
      async () => {
      },
    );
  });
  Rhum2.testSuite("type()", () => {
    Rhum2.testCase("It should set the value of the element", async () => {
      const cinco = new Cinco("https://chromestatus.com");
      await cinco.start();
      await cinco.type('input[placeholder="Filter"]', "hello world");
      const val = await cinco.getInputValue('input[placeholder="Filter"]');
      await cinco.done();
      Rhum2.asserts.assertEquals(val, "hello world");
    });
    Rhum2.testCase(
      "It should throw an error when there is a syntax error",
      async () => {
        const cinco = new Cinco("https://chromestatus.com");
        await cinco.start();
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await cinco.type("q;q", "hello");
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await cinco.done();
        Rhum2.asserts.assertEquals(error, {
          errored: true,
          msg:
            `DOMException: Failed to execute 'querySelector' on 'Document': 'q;q' is not a valid selector.\n    at <anonymous>:1:10: "document.querySelector('q;q').value = "hello""`,
        });
      },
    );
    Rhum2.testCase(
      "It should throw an error when no element exists for the selector",
      async () => {
        const cinco = new Cinco("https://chromestatus.com");
        await cinco.start();
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await cinco.type("input#dont-exist", "qaloo");
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await cinco.done();
        Rhum2.asserts.assertEquals(error, {
          errored: true,
          msg:
            `TypeError: Cannot set property 'value' of null\n    at <anonymous>:1:50: "document.querySelector('input#dont-exist').value = "qaloo""`,
        });
      },
    );
  });
});
