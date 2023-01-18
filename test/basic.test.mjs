import { test } from "@playwright/test";
import assert from "node:assert";

test("adds HTMLStyleElement#scoped to prototype", async ({ page }) => {
  await page.goto("http://localhost:4200/test/basic.html");
  await page.evaluate(() => {
    assert("scoped" in HTMLStyleElement.prototype);
  });
});

test("adds HTMLStyleElement#scoped to existing elements", async ({ page }) => {
  await page.goto("http://localhost:4200/test/basic.html");
  await page.evaluate(() => {
    const style = document.querySelector("style");
    assert(style.scoped === style.hasAttribute("scoped"));
  });
});

test("adds HTMLStyleElement#scoped to new elements", async ({ page }) => {
  await page.goto("http://localhost:4200/test/basic.html");
  await page.evaluate(() => {
    const style = document.createElement("style");
    assert(style.scoped === false);
  });
});
