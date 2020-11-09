import { Rhum } from "../deps.ts";
import { Sinco } from "../../mod.ts";

Rhum.testPlan(() => {
  Rhum.testSuite("click()", () => {
    Rhum.testCase("It should allow clicking of elements", async () => {
      const sinco = await Sinco.build("https://chromestatus.com");
      await sinco.click('a[href="/features/schedule"]');
      await sinco.assertSee("Release timeline");
      await sinco.done();
    });
    Rhum.testCase(
      "It should throw an error when there is a syntax error",
      async () => {
        const sinco = await Sinco.build("https://chromestatus.com");
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await sinco.click("q;q");
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await sinco.done();
        Rhum.asserts.assertEquals(error, {
          errored: true,
          msg:
            "DOMException: Failed to execute 'querySelector' on 'Document': 'q;q' is not a valid selector.\n    at <anonymous>:1:10: \"document.querySelector('q;q').click()\"",
        });
      },
    );
    Rhum.testCase(
      "It should throw an error when no element exists for the selector",
      async () => {
        const sinco = await Sinco.build("https://chromestatus.com");
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await sinco.click("a#dont-exist");
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await sinco.done();
        Rhum.asserts.assertEquals(error, {
          errored: true,
          msg:
            `TypeError: Cannot read property 'click' of null\n    at <anonymous>:1:39: "document.querySelector('a#dont-exist').click()"`,
        });
      },
    );
  });
  Rhum.testSuite("getInputValue()", () => {
    Rhum.testCase(
      "It should get the value for the given input element",
      async () => {
        const sinco = await Sinco.build("https://chromestatus.com");
        await sinco.type('input[placeholder="Filter"]', "hello world");
        const val = await sinco.getInputValue('input[placeholder="Filter"]');
        Rhum.asserts.assertEquals(val, "hello world");
        await sinco.done();
      },
    );
    Rhum.testCase(
      "It should throw an error when there is a syntax error",
      async () => {
        const sinco = await Sinco.build("https://chromestatus.com");
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await sinco.getInputValue("q;q");
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await sinco.done();
        Rhum.asserts.assertEquals(error, {
          errored: true,
          msg:
            `DOMException: Failed to execute 'querySelector' on 'Document': 'q;q' is not a valid selector.\n    at <anonymous>:1:10: "document.querySelector('q;q').value"`,
        });
      },
    );
    Rhum.testCase(
      "It should throw an error when no element exists for the selector",
      async () => {
        const sinco = await Sinco.build("https://chromestatus.com");
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await sinco.getInputValue('input[name="dontexist"]');
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await sinco.done();
        Rhum.asserts.assertEquals(error, {
          errored: true,
          msg:
            `TypeError: Cannot read property 'value' of null\n    at <anonymous>:1:50: "document.querySelector('input[name="dontexist"]').value"`,
        });
      },
    );
    Rhum.testCase(
      "Should return undefined when element is not an input element",
      async () => {
        const sinco = await Sinco.build("https://chromestatus.com");
        const val = await sinco.getInputValue('a[href="/features/schedule"]');
        await sinco.done();
        Rhum.asserts.assertEquals(val, "undefined");
      },
    );
  });
  Rhum.testSuite("waitForAjax()", () => {
    Rhum.testCase(
      "It should wait for a long running ajax process to finish",
      async () => {
      },
    );
  });
  Rhum.testSuite("type()", () => {
    Rhum.testCase("It should set the value of the element", async () => {
      const sinco = await Sinco.build("https://chromestatus.com");
      await sinco.type('input[placeholder="Filter"]', "hello world");
      const val = await sinco.getInputValue('input[placeholder="Filter"]');
      await sinco.done();
      Rhum.asserts.assertEquals(val, "hello world");
    });
    Rhum.testCase(
      "It should throw an error when there is a syntax error",
      async () => {
        const sinco = await Sinco.build("https://chromestatus.com");
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await sinco.type("q;q", "hello");
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await sinco.done();
        Rhum.asserts.assertEquals(error, {
          errored: true,
          msg:
            `DOMException: Failed to execute 'querySelector' on 'Document': 'q;q' is not a valid selector.\n    at <anonymous>:1:10: "document.querySelector('q;q').value = "hello""`,
        });
      },
    );
    Rhum.testCase(
      "It should throw an error when no element exists for the selector",
      async () => {
        const sinco = await Sinco.build("https://chromestatus.com");
        const error = {
          errored: false,
          msg: "",
        };
        try {
          await sinco.type("input#dont-exist", "qaloo");
        } catch (err) {
          error.errored = true;
          error.msg = err.message;
        }
        await sinco.done();
        Rhum.asserts.assertEquals(error, {
          errored: true,
          msg:
            `TypeError: Cannot set property 'value' of null\n    at <anonymous>:1:50: "document.querySelector('input#dont-exist').value = "qaloo""`,
        });
      },
    );
  });
});
