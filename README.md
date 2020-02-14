This is a polyfill for scoped CSS, also known as `<style scoped>`.
Check out a [small demo](https://samthor.github.io/scoped/test/test.html).

# Usage

Include the polyfill (via your favourite package manager as `style-scoped`) and then include a `<style scoped>` tag:

```html
<script src="node_modules/style-scoped/scoped.min.js"></script>
<div>
  <style scoped>
    h1 { color: red; }
  </style>
  <h1>I'm red</h1>
</div>
<h1>I'm not</h1>
```

This can help you provide CSS encapsulation for your projects.
The library is about ~1.9k minified and gzipped.

## Supports

The polyfill supports Firefox, Chrome and Safari.
It _should_ support IE11 and above, but that has not yet been tested.
(Mostly, it requires browsers with `WeakMap` and `MutationObserver`).

The code works by applying a custom attribute name, e.g. `__scoped_123`, to the parent element of the `<style scoped>` tag, and modifying the style rules to have this as a prefix.
If the scoped CSS changes (via `.textContent`), or its node is moved etc, the style rules are reevaluated.

## Config

If `window.scopedCSS` is defined before the polyfill is loaded, it accepts two options:

* `scopedCSS.applyToClass` (default `false`): if true, the polyfill will use a class, not an attribute—_this is important for IE11_, which has notoriously poor performance for attribute selectors (but classes are more fragile)
* `scopedCSS.prefix`: a custom prefix for the attribute or class name set on the scope

For example:

```html
<script>
  window.scopedCSS = {applyToClass: true, prefix: '_some_custom_name'};
</script>
<script type="module">
import './node_modules/style-scoped/scoped.min.js';
</script>
```

## Advanced

As well as scoping regular CSS rules, the polyfill also operates on `:scope`.
This rule is applied to the immediate parent of the `<style scoped>` tag, e.g.:

```html
<div><!-- will have blue background -->
  <style scoped>
    :scope {
      background: blue;
    }
    div:scope {
      /** this also works, but is unlikely to be useful */
      color: white;
    }
  </style>
</div>
```

Note that `:scope` is supported by most modern browsers—but without `<style scoped>` support, [it will match the HTML element](https://developer.mozilla.org/en-US/docs/Web/CSS/:scope).

# Background

Scoped CSS was natively available in older versions of Firefox and Chrome, but was removed around 2014.
As of 2020, it is **not** supported natively in any browser.
However, it might be useful for your project.

This polyfill is intended as a more production-ready, modern version [of older work](https://www.google.com/search?q=scoped+css+polyfill).
Unlike previous polyfills, it:

* uses `MutationObserver`, observing change to styles over time
* scopes imports, e.g. `@import './other-css-file.css';`
* is configurable

# Notes

* The polyfill doesn't operate on all CSS rules: e.g., `@keyframes`, `@font` are ignored
* CSS rules with a matching hash could be deduped, rather than modified individually
* This doesn't apply to Shadow DOM, but that has a form of scoped CSS already
* External CSS via `@import` is loaded dynamically with an XHR, so it may take a little while to arrive ([see background](https://github.com/samthor/scoped/issues/2))

# Release

Compile code with [Closure Compiler](https://closure-compiler.appspot.com/home).

```
// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// @output_file_name scoped.min.js
// ==/ClosureCompiler==

// code here
```
