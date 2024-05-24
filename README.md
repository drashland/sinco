# Sinco

[![Latest Release](https://img.shields.io/github/release/drashland/sinco.svg?color=bright_green&label=latest)](https://github.com/drashland/sinco/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/drashland/sinco/master.yml?branch=main&label=branch:main)](https://github.com/drashland/sinco/actions/workflows/master.yml?query=branch%3Amain)
[![Drash Land Discord](https://img.shields.io/badge/discord-join-blue?logo=discord)](https://discord.gg/RFsCSaHRWK)

<img align="right" src="./logo.svg" alt="Drash Land - Sinco logo" height="150" style="max-height: 150px">

Sinco is a browser automation and testing tool. What this means is, Sinco runs a
subprocess for Chrome, and will communicate to the process via the Chrome
Devtools Protocol, as the subprocess opens a WebSocket server that Sinco
connects to. This allows Sinco to spin up a new browser tab, go to certain
websites, click buttons and so much more, all programatically. All Sinco does is
runs a subprocess for Chrome, so you do not need to worry about it creating or
running any other processes.

Sinco is used to run or test actions of a page in the browser. Similar to unit
and integration tests, Sinco can be used for "browser" tests.

Some examples of what you can build are:

- Browser testing for your web application
- Web scraping
- Automating interactions with a website using code

Sinco is similar to the more well-known tools that achieve the same thing, such
as Puppeteer. What sets Sinco apart is:

- It is the first Deno browser automation tool
- It does not try to install a specific Chrome version on your computer
- It is transparent: It will use the browser and version you already have
  installed.

Its maintainers have taken concepts from the following ...

- [Puppeteer](https://pptr.dev/) — following a similar API and used as
  inspriration ... and mixed in their own concepts and practices such as ...

Developer UX Approachability Test-driven development Documentation-driven
development Transparency

## Table of Contents

1. [Documentation](#documentation)

    1.1. [Getting Started](#getting-started)

    1.2. [Waiting For Actions](#waiting-for-actions-page-to-be-loaded-requests-to-finish)

    1.3. [Visiting Pages](#visiting-pages)

    1.4. [Taking Screenshots](#taking-screenshots)

    1.5. [Dialogs](#dialogs)

    1.6. [Cookies](#cookies)

    1.7. [Evaluating](#evaluating-full-dom-or-dev-console-access)

    1.8. [Retrieving Console Errors](#retreiving-console-errors)

    1.9. [Working With Elements](#working-with-elements-clicking-inputs)

    1.10. [Authenticating](#authenticating)

## Documentation

### Getting Started

You use Sinco to build a subprocess (client) and interact with the page that has
been opened. This defaults to "about:blank".

```ts
import { Client } from "...";
const { browser, page } = await Client.create();
```

The hostname and port of the subprocess and debugger default to `localhost` and
`9292` respectively. If you wish to customise this, you can:

```ts
await Client.create({
  hostname: "127.0.0.1",
  debuggerPort: 1000,
});
```

Be sure to always call `.close()` on the client once you've finished any actions
with it, to ensure you do not leave any hanging ops, For example, closing after
the last `browser.*` call or before assertions.

You can also use an existing remote process and not run a new subprocess
yourself.

```ts
import { Client } from "...";
const { browser, page } = await Client.create({
  remote: true,
});
```

### Waiting for Actions (page to be loaded, requests to finish)

There is only so much we can really do on our end. Whilst we try out best to wait for the correct events from the websocket,
websites load in various ways. Some examples might be:

- A basic website that may take 200ms to load and the DOM is fully ready by then
- A Vue site that uses Inertia or Vite. The load has loaded but the page/network is still fetching components

There are simple ways to handle this though

#### Wait until a specific element is visible in the page

For example if you're testing your login page, you may wait until the email field is visible to start typing into it

```ts
import { Client } from "...";
import { delay } from "..."; // deno std

const { browser, page } = await Client.create();
const until = async (cb: () => Promise<void>) => {
  while (!(await cb())) {
    await delay(100);
  }
}
await page.location("http://localhost/login");
await until(() => await page.evaluate('document.querySelector("[input=email]")'));
await page.evaluate(() => document.querySelector("[type=email]").value = '...');
```

What this will do is you will keep calling `until`, until the result of `evaluate` is truthy.

#### Wait until the network is idle

We use this approach when clicking buttons that result in a navigation as well!

```ts
import { Client } from "...";
import { waitUntilNetworkIdle } from ".../src/utility.ts";

const { browser, page } = await Client.create();
await page.location("http://localhost/login");
await waitUntilNetworkIdle();
```

This method will wait until there have been 0 network requests in a 500ms timeframe.

### Visiting Pages

You can do this by calling `.location()` on the page:

```ts
const { browser, page } = await Client.create();
await page.location("https://some-url.com");
```

### Taking Screenshots

Utilise the `.screenshotMethod()` on a page or element:

```ts
const { browser, page } = await Client.create();
await page.location("https://some-url.com");
const uint8array = await page.screenshot({ // Options are optional
  format: "jpeg", // or png. Defaults to jpeg
  quality: 50, // 0-100, only applicable if format is optional. Defaults to 80
});
const elem = await page.querySelector("div");
const uint8array = await elem.screenshot(); // Same options as above
```

### Dialogs

You're able to interact with dialogs (prompt, alert).

```ts
const { browser, page } = await Client.create();
await page.location("https://some-url.com");
await page.dialog(false); // Decline the dialog
await page.dialog(true); // Accept it
await page.dialog(true, "I will be joining on 20/03/2024"); // Accept and provide prompt text
```

### Cookies

You can get or set cookies

```ts
const { browser, page } = await Client.create();
await page.location("https://some-url.com");
await page.cookie(); // Get the cookies, [ { ... }, { ... } ]
await page.cookie({
  name: "x-csrf-token",
  value: "1234",
  url: "/",
});
```

### Evaluating (full DOM or dev console access)

Evaluating will evaluate a command and you can use this to make any query to the
DOM, think of it like you've got the devtools open. Maybe you want to create an
element and add it to a list, or get the `innerHTML` of an element, or get the
page title.

```ts
const { browser, page } = await Client.create();
await page.location("https://some-url.com");
await page.evaluate("1 + 1"); // 2
await page.evaluate(() => {
  return document.title;
}); // "Some title"
await page.evaluate(() => {
  return document.cookie;
}); // "cxsrf=hello;john=doe"

// You can reference variables inside the callback but you must pass them as parameters, and you can pass as many as you like. See how im using `username` and `greeting` in the callback, so I can pass these in as parameters to `.evaluate()` and also access them from the callback.
await page.evaluate(
  (username, greeting) => {
    document.body.innerHTML = `${greeting}, ${username}`;
  },
  "Sinco",
  "Hello",
);
```

### Retreiving console errors

This could be useful if you would like to quickly assert the page has no console
errors. `.consoleErrors()` will return any console errors that have appeared up
until this point.

```ts
const { browser, page } = await Client.create();
await page.location("https://some-url.com");
await page.evaluate("1 + 1"); // 2
const errors = await page.consoleErrors();
```

Due to race conditions with console errors, it's best not to assert the whole
array, and instead assert the length or if it contains, for example:

```ts
const errors = await page.consoleErrors(); // ["user not defined", "undefined property company"];
// It could be that on another test run, "user not defined" is the 2nd item in the array, so instead do the below.
assertEquals(errors.length, 2);
assertEquals(errors.includes("user not defined"));
```

### Working with Elements (clicking, inputs)

We provide ways to set files on a file input and click elements.

To create a reference to an element, use
`await page.querySelector("<css selector>")`, just like how you would use it in
the browser.

#### File operations

We provide an easier way to set a file on a file input element.

```ts
const { browser, page } = await Client.create();
await page.location("https://some-url.com");
const input = await page.querySelector('input[type="file"]');
await input.file("./users.png");
const multipleInput = await page.querySelector('input[type="file"]');
await multipleInput.files(["./users.png", "./company.pdf"]);
```

#### Clicking

You can also click elements, such as buttons or anchor tags.

```ts
const { browser, page } = await Client.create();
await page.location("https://some-url.com");
const button = await page.querySelector('button[type="button"]');
await button.click();
// .. Do something else now button has been clicked

// `navigation` is used if you need to wait for some kind of HTTP request, such as going to a different URL, or clicking a button that makes an API request
const anchor = await page.querySelector("a");
await anchor.click({
  waitFor: "navigation",
});

const anchor = await page.querySelector('a[target="_BLANK"]');
const newPage = await anchor.click({
  waitFor: "newPage",
});
// ... Now `newPage` is a reference to the new tab that just opened
```

### Authenticating

One way of authenticating, say if there is a website that is behind a login, is
to manually set some cookies e.g., `X-CSRF-TOKEN`:

```ts
const { browser, page } = await Client.create();
await page.location("https://some-url.com/login");
const token = await page.evaluate(() =>
  document.querySelector('meta[name="token"]').value
);
await page.cookie({
  name: "X-CSRF-TOKEN",
  value: token,
});
await page.location("https://some-url.com/api/users");
```

Another approach would be to manually submit a login form:

```ts
const login = async (page: Page) => {
  await page.location("http://localhost/login");
  await until(async () => (await page.evaluate('document.querySelector("input[type=email]")')))
  await page.evaluate(() => {
    document.querySelector('input[type="email"]').value = "admin@example.com";
    document.querySelector('input[type="password"]').value = 'secret'
  })
  const submit = await page.querySelector("button[type=submit]");
  await submit.click({
    waitFor: "navigation",
  });
};
const { browser, page } = await Client.create();
await login(page);
// Visit the required page
await page.location(url);
// Wait for the page to property load so the dom is ready
await waitUntilNetworkIdle();
// ... Assertions or actions
```
