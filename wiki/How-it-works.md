## Hooking into element creation

One of the things that this polyfill needs to do is make sure that all
`HTMLStyleElement` instances are monitored so that we can watch for any changes
to their direct child text nodes (but not recursive text nodes).

To do this, we use the `enableInDocument()` function which hijacks a document's
`createElement()` and `createElementNS()` functions to make sure that we can
hook into the creation of any `<style>` element. We also add a
`MutationObserver` to the document to watch for any `<style>` elements that are
added to the document.

This handles these parts of a custom element lifecycle:

- `connectedCallback()`: When the element is added to the document
- `disconnectedCallback()`: When the element is removed from the document
- `constructor()`: When newly created **or** an existing element is hydrated

We need an `enableInDocument()` function because we need to make sure that we
cover enough of the element's interaction surface (i.e. how it's created,
mutated, moved, etc.) to add in our own functionality.

## Using a CSSS selector prefix

The crux of this entire polyfill is prefixing CSS selectors with a unique
`[scoped-id="4b29"]` or similar qualifying selector.

```html
<div>
  <style scoped>
    div {
      background-color: blue;
    }
    p {
      color: red;
    }
  </style>
  <p>Hello world!</p>
</div>

<!-- Rewritten to: -->

<div scoped-id="3e51">
  <style scoped>
    [scoped-id="3e51"] div,
    div[scoped-id="3e51"] {
      background-color: blue;
    }
    [scoped-id="3e51"] p,
    p[scoped-id="3e51"] {
      color: red;
    }
  </style>
  <p>Hello world!</p>
</div>
```

Here's some more examples of mapping CSS selectors to their scoped versions:

<!-- prettier-ignore -->
```css
p.foo#bar {}
[scoped-id="4b29"] p.foo#bar, p.foo#bar[scoped-id="4b29"] {}

p.foo + p.bar {}
[scoped-id="4b29"] p.foo + p.bar, p.foo + p.bar[scoped-id="4b29"] {}
```

The catch that makes this difficult is parsing all the complicated CSS queries
in as little code as possible as fast as possible.

One of the tricks we use is to break the CSS selector down into a base selector
with a bunch of `:f()` sub-selectors. We then recursively parse the
sub-selectors and run the same prefix logic to everything in them.

1. Replace all quoted strings with CSS-safe placeholders: `p[foo="bar"]` ➡️
   `p[foo=STR_5b2d]`
2. Replace all complicated sub-selector groups with CSS-safe placeholders
   `p:not([foo])` ➡️ `pFN_b2df`
3. Split the selector list into individual simple selectors `p, div` ➡️ `p`,
   `div`
4. For each simple selector,
   1. Append "," to the end of the selector: `p` ➡️ `p,`
   2. Append everything except that last comma to the end of the selector: `p,`
      ➡️ `p, p`
   3. Append the CSS selector prefix with _no space_ to the end of the selector:
      `p, p` ➡️ `p, p[scoped-id="4b29"]`
   4. Prepend the CSS selector prefix with a space to the beginning of the
      selector: `p, p[scoped-id="4b29"]` ➡️
      `[scoped-id="4b29"] p, p[scoped-id="4b29"]`
5. Replace all the placeholders with their original values

This function should implement the behviour of the examples given by the [Chrome
Developers showcase] and mirror the live behaviour of the Chrome Canary
implementation of the [`@scope`] rule.

<!-- prettier-ignore-start -->
[chrome developers showcase]: https://developer.chrome.com/blog/a-new-experimental-feature-style-scoped/
[`@scope`]: https://drafts.csswg.org/css-cascade-6/#scope-atrule
<!-- prettier-ignore-end -->
