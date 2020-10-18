<p align="center">
  <img height="200" src="https://drash.land/dawn/assets/img/dawn.svg" alt="Dawn logo">
  <h1 align="center">Dawn</h1>
</p>
<p align="center">Browser Automation and Testing Tool for Deno.</p>
<p align="center">
  <a href="https://github.com/drashland/dawn/releases">
    <img src="https://img.shields.io/github/release/drashland/dawn.svg?color=bright_green&label=latest">
  </a>
  <a href="https://github.com/drashland/dawn/actions">
    <img src="https://img.shields.io/github/workflow/status/drashland/dawn/master?label=ci">
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

**Documentation page coming soon!** For now, use https://doc.deno.land/https://deno.land/x/dawn

## Table of Contents
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Features](#features)
- [Why use Dawn?](#why-use-dawn)
- [Mirrors](#mirrors)
- [Articles](#articles)
- [Contributing](#contributing)
- [License](#license)

## Quick Start
```typescript
// File: app_test.ts

import { Dawn } from "https://deno.land/x/dawn@v0.1.0/mod.ts";

Deno.test('I will pass', async () => {
  // Initialise dawn
  const dawn = new Dawn("https://chromestatus.com")

  // Do stuff
  await dawn.assertUrlIs("https://chromestatus.com/features")
  await dawn.click('a[href="/features/schedule"]')
  await dawn.assertUrlIs("https://chromestatus.com/features/schedule")

  // Finish
  await dawn.done()
})

Deno.test('I will fail', async () => {
  // Initialise dawn
  const dawn = new Dawn("https://chromestatus.com")

  // Do stuff
  await dawn.assertUrlIs("https://chromestatus.com/feeaatureesss")
  // ...

  // Finish
  await dawn.done()
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

[Full Documentation](https://drash.land/dawn)

## Features

- [x] [Click Elements](url)
- [x] [Get Input Values](url)
- [x] [Custom assertions](url)
    - [x] `assertUrlIs`
    - [x] `assertSee`
- [x] [Wait For AJAX](url)
- [x] [Type into an Input Tags](url)

## Why Use Dawn?

Dawn is a first of it's kind for Deno, allowing you, the developer, to test the UI and UX of your web apps. Dawn provides many utilities to do so, and doesn't require any npm modules or the `--unstable` flag, it is simply a layer on top of headless chrome.

Dawn takes concepts from the following:

* <a href="https://laravel.com/docs/8.x/dusk" target="_BLANK">Laravel Dusk</a> &mdash; taking inspiration from the methods the Dusk API provides</a>

## Mirrors

* [ ] https://nest.land/package/dawn

## Articles

*No articles have been created as of yet*

## Contributing

Contributors are welcomed!

Please read through our [contributing guidelines](./.github/CONTRIBUTING.md). Included are directions for opening issues, coding standards, and notes on development.

## License

By contributing your code, you agree to license your contribution under the [MIT License](./LICENSE).

## Acknowledgements

- [@caspervonb](https://github.com/caspervonb) - A huge help in getting this project working by helping understand how we can interact with the browser