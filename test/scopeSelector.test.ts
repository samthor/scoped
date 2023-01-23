import { test, expect } from "vitest";
import scopeSelector from "../src/scopeSelector.js";

test("simple selectors", () => {
  const actual = scopeSelector("div", ":PRE");
  expect(actual).toBe(":PRE div, div:PRE");
});

test("complex selectors", () => {
  const actual = scopeSelector("div + p", ":PRE");
  expect(actual).toBe(":PRE div + p, div + p:PRE");
});

test("compound selectors", () => {
  const actual = scopeSelector("div.class#id", ":PRE");
  expect(actual).toBe(":PRE div.class#id, div.class#id:PRE");
});

test("quotes", () => {
  const actual = scopeSelector("div[data-text='']", ":PRE");
  expect(actual).toBe(":PRE div[data-text=''], div[data-text='']:PRE");
});

test("escaped quotes", () => {
  const actual = scopeSelector("div[data-text='\\'']", ":PRE");
  expect(actual).toBe(":PRE div[data-text='\\''], div[data-text='\\'']:PRE");
});

test("escaped comma", () => {
  const actual = scopeSelector(".cla\\,ss", ":PRE");
  expect(actual).toBe(":PRE .cla\\,ss, .cla\\,ss:PRE");
});

test("escaped space", () => {
  const actual = scopeSelector("#i\\ d", ":PRE");
  expect(actual).toBe(":PRE #i\\ d, #i\\ d:PRE");
});
