import { assert, expect, test } from "vitest";
import scopeSelectorToCondition from "../src/selectorScopedToCondition.js";

test("div => :PRE div, div:PRE", () => {
  const actual = scopeSelectorToCondition("div", ":PRE");
  expect(actual).toBe(":PRE div, div:PRE");
});

test("div + p => :PRE div + p, div + p:PRE", () => {
  const actual = scopeSelectorToCondition("div + p", ":PRE");
  expect(actual).toBe(":PRE div + p, div + p:PRE");
});

test("div:not([data-json]) => :PRE div:not([data-json]), div:not([data-json]):PRE", () => {
  const actual = scopeSelectorToCondition("div:not([data-json])", ":PRE");
  expect(actual).toBe(":PRE div:not([data-json]), div:not([data-json]):PRE");
});
