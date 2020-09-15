import { Dawn } from "../mod.ts"

await Dawn()
    .visit("https://google.com")
    .assertPathIs("https://google.com/");