This is a polyfill for scoped CSS, also known as `<style scoped>`, a feature that is useful for building simple components (but which was removed from the HTML specification around 2016).
Check out a [small demo](https://samthor.github.io/scoped/demo/test.html).

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
You need to include it on your own domain, as it does odd changes that are seen as security problems if loaded cross-origin.

## Supports

The polyfill supports Firefox, Safari and Chromium-based browsers (and should support IE11 and above).
(It requires browsers with `WeakMap` and `MutationObserver`).

The code works by applying a custom attribute name, e.g. `__scoped_123`, to the parent element of the `<style scoped>` tag, and modifying the style rules to have this as a prefix.
If the scoped CSS changes (via `.textContent`), or its node is moved etc, the style rules are reevaluated.

## Config

If `window.scopedCSS` is defined before the polyfill is loaded, it accepts two options:

* `scopedCSS.applyToClass` (default `false`): if true, the polyfill will use a class, not an attribute
* `scopedCSS.prefix`: a custom prefix for the attribute or class name set on the scope

For example:

```html
<script>
  window.scopedCSS = {applyToClass: true, prefix: '_some_custom_name'};
</script>
<script type="module">
import './node_modules/style-scoped/scoped.min.js';
// or maybe
import 'style-scoped';
</script>
```

## Advanced

As well as scoping regular CSS rules, the polyfill also rewrite `:scope`.
This refers to the parent of the `<style scoped>` tag, e.g.:

```html
<div><!-- just this div will have a blue background -->
  <style scoped>
    :scope {
      background: blue;
    }
  </style>
</div>
```

Note that `:scope` is supported by most modern browsers—but without `<style scoped>` support, [it will match the HTML element](https://developer.mozilla.org/en-US/docs/Web/CSS/:scope) and is the same as `:root`.

⚠️ Rules which use `:scope` inside another selector (e.g. `:is(div:scope)`) are not currently supported and will be cleared.
If this is _actually something you need_, I will eat my hat. 🎩

# Notes

* The polyfill doesn't operate on all CSS rules: e.g., `@keyframes`, `@font` are ignored
* If you depend on cross-domain CSS via `@import`, this is loaded dynamically with an XHR: so it may take a little while to arrive ([see](https://github.com/samthor/scoped/issues/2) [background](https://github.com/samthor/scoped/issues/3))

# Release

Compile code with `npm run build`.