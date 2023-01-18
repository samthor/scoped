#!/usr/bin/env node
/**
 * @file
 * This file runs a WPT-like test runner. It searches the test/ directory for
 * any HTML files, and then runs those files using Playwright. If the pages
 * load without error, the test passes. If they throw an error, the test fails.
 */

import * as fs from "node:fs/promises";
import { chromium } from "playwright";
import serveHandler from "serve-handler";
import * as http from "node:http";

const htmlFiles = (await fs.readdir("test")).filter((x) => x.endsWith(".html"));
const server = http.createServer(serveHandler);
server.listen(4200);

const browser = await chromium.launch();
const context = await browser.newContext();
context.exposeFunction("PLAYWRIGHT_console_log", console.log);
context.exposeFunction("PLAYWRIGHT_console_error", console.error);
context.addInitScript(() => {
  globalThis.INIT_errorHappened = false;
  globalThis.addEventListener("error", (e) => {
    globalThis.INIT_errorHappened = true;
    console.error(e.error);
  });
  globalThis.addEventListener("unhandledrejection", (e) => {
    globalThis.INIT_errorHappened = true;
    console.error(e.reason);
  });

  const NATIVE_console_log = console.log;
  console.log = (...args) => {
    NATIVE_console_log(...args);
    PLAYWRIGHT_console_log(...args);
  };
  const NATIVE_console_error = console.error;
  console.error = (...args) => {
    NATIVE_console_error(...args);
    PLAYWRIGHT_console_error(...args);
  };
});

const page = await context.newPage();
for (const htmlFile of htmlFiles) {
  console.log(`Running ${htmlFile}...`);
  await page.goto(`http://localhost:4200/test/${htmlFile}`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const errorHappened = await page.evaluate(
    () => globalThis.INIT_errorHappened
  );
  if (errorHappened) {
    console.error(`Error happened in ${htmlFile}`);
  }
}
browser.close();
server.close();
