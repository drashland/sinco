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

## Documentation

### Getting Started

You use Sinco to build a subprocess (client) and interact with the page that has
been opened. This defaults to "about:blank".

```ts
import { build } from "...";
const { browser, page } = await build();
```

Be sure to always call `.close()` on the client once you've finished any actions
with it, to ensure you do not leave any hanging ops, For example, closing after
the last `browser.*` call or before assertions.

### Visiting Pages

You can do this by calling `.location()` on the page:

```ts
const { browser, page } = await build();
await page.location("https://some-url.com");
```

## Taking Screenshots

Utilise the `
