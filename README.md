<p align="center">
  <img height="200" src="https://drash.land/sinco/assets/img/sinco.svg" alt="Sinco logo">
  <h1 align="center">Sinco</h1>
</p>
<p align="center">Browser Automation and Testing Tool for Deno.</p>
<p align="center">
  <a href="https://github.com/drashland/sinco/releases">
    <img src="https://img.shields.io/github/release/drashland/sinco.svg?color=bright_green&label=latest">
  </a>
  <a href="https://github.com/drashland/sinco/actions">
    <img src="https://img.shields.io/github/workflow/status/drashland/sinco/master?label=ci">
  </a>
  <a href="https://discord.gg/SgejNXq">
    <img src="https://img.shields.io/badge/chat-on%20discord-blue">
  </a>
  <a href="https://twitter.com/drash_land">
    <img src="https://img.shields.io/twitter/url?label=%40drash_land&style=social&url=https%3A%2F%2Ftwitter.com%2Fdrash_land">
  </a>
  <a href="https://rb.gy/vxmeed">
    <img src="https://img.shields.io/badge/Tutorials-YouTube-red">
  </a>
</p>

---

## Table of Contents
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Features](#features)
- [Why use Sinco?](#why-use-sinco)
- [Mirrors](#mirrors)
- [Articles](#articles)
- [Contributing](#contributing)
- [License](#license)

## Quick Start
```typescript
// File: app_test.ts

import { HeadlessBrowser } from "https://deno.land/x/sinco@v0.1.0/mod.ts";

Deno.test('I will pass', async () => {
  // Initialise sinco
  const sinco = new HeadlessBrowser("https://chromestatus.com")
  await sinco.build()

  // Do stuff
  await sinco.assertUrlIs("https://chromestatus.com/features")
  await sinco.click('a[href="/features/schedule"]')
  await sinco.assertUrlIs("https://chromestatus.com/features/schedule")

  // Finish
  await sinco.done()
})

Deno.test('I will fail', async () => {
  // Initialise sinco
  const sinco = new HeadlessBrowser("https://chromestatus.com")
  await sinco.build()

  // Do stuff
  await sinco.assertUrlIs("https://chromestatus.com/feeaatureesss")
  // ...

  // Finish
  await sinco.done()
})
```

```
$ deno test --allow-run --allow-net app_test.ts
running 2 tests
test I will pass ... ok (2550ms)
test I will fail ... FAILED (1809ms)

failures:

I will fail
AssertionError: Values are not equal:


    [Diff] Actual / Expected


-   "https://chromestatus.com/features"
+   "https://chromestatus.com/feeaatureesss"
```

## Documentation

[Full Documentation](https://drash.land/sinco)

## Features

See the features [here](https://drash.land/sinco#features)

## Why Use Sinco?

Sinco is a first of it's kind for Deno, allowing you, the developer, to test the UI and UX of your web apps. Sinco provides many utilities to do so, and doesn't require any npm modules or the `--unstable` flag, it is simply an API wrapper around headless chrome.

Sinco takes concepts from the following:

* <a href="https://laravel.com/docs/8.x/dusk" target="_BLANK">Laravel Dusk</a> &mdash; taking inspiration from the methods the Dusk API provides</a>

## Mirrors

* [ ] https://nest.land/package/sinco

## Articles

*No articles have been created as of yet*

## Contributing

Contributors are welcomed!

Please read through our [contributing guidelines](https://github.com/drashland/.github/blob/master/CONTRIBUTING.md). Included are directions for opening issues, coding standards, and notes on development.

## License

By contributing your code, you agree to license your contribution under the [MIT License](https://github.com/drashland/.github/blob/master/LICENSE).

## Acknowledgements

- [@caspervonb](https://github.com/caspervonb) - A huge help in getting this project working by helping understand how we can interact with the browser