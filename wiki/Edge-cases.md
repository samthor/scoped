## Adding child elements instead of text to `<style>`

When writing HTML, the `<style>` tag will never have child elements. Any HTML
tags you add inside of a `<style>` tag will be treated as text. However, when
using JavaScript to add child elements to a `<style>` element, the browser
doesn't care. It doesn't invoke the parser, it just adds the child elements.

For instance, the following `<style>` tag will be treated as invalid CSS, but
building it using JavaScript will not.

```xml
<style>
  p {
    color: red;
  }
  <span>Hello</span>
</style>
```

```js
const style = document.createElement("style");
style.textContent = "p { color: red; }";
document.head.append(style);

const span = document.createElement("span");
span.textContent = "Hello";

style.append(span);

console.log(style);
// => <style>p { color: red; }<span>Hello</span></style>
```

The edge case comes from the fact that these child elements contribute to the
`.textContent`, `.innerText`, and `.innerHTML`, but they _don't_ show up at all
in the `.sheet` parsed CSSOM.

You can test this yourself with this snippet:

```js
const style = document.createElement("style");
document.head.append(style);

const span = document.createElement("span");
span.textContent = "p { color: red; }";

// This doesn't affect the page's styles. At all. Only direct child text nodes
// are parsed.
style.append(span);

console.log(style.sheet.cssRules);
//=> []
```

This means that we can't use the `.textContent` as a source of truth for getting
the `.cssText`-ish representation of a `<style>` element. We need to actually
use the parsed CSSOM tree.

This is also an issue when triggering updates and re-parsing the CSSOM. We need
to make sure that we don't observe the child elements, only the text. The best
way to do this is using a `MutationObserver` that observes each individual
`<style>` element when constructed for only its `characterData` _without_
`childList` or `subtree` set.

```ts
// The handleCharacterDataMutations function is omitted for brevity. It would
// most likely re-parse the CSSOM and re-prefix everything with a scoped query.
const observer = new MutationObserver(handleCharacterDataMutations);

function handleNewHTMLStyleElement(style: HTMLStyleElement) {
  observer.observe(style, { characterData: true });
}
```

## Using `<style>` elements that haven't been initialized

This is most likely to occur when getting/using a `<style>` element that is from
another document or context. A good example is the `DOMParser#parseFromString()`
function which returns a completely foreign `Document` instance.

```js
const html = `
  <style scoped>
    p {
      color: red;
    }
  </style>
`;
const doc = new DOMParser().parseFromString(html, "text/html");
```

In this case, the `<style>` element is from a different document, so we weren't
able to hook into its creation. This means that we can't observe it for
attribute changes. Since our polyfill for the `.scoped` attribute is pretty
bare-bones and only relies on the presence/absence of the attribute, it still
works.

```js
class C {
  get scoped() {
    return this.hasAttribute("scoped");
  }
  set scoped(value) {
    if (value) {
      this.setAttribute("scoped", "");
    } else {
      this.removeAttribute("scoped");
    }
  }
}
```

But, if we want to be right and proper 🧐, we should use a brand check before
allowing access to the `.scoped` property just like all other native properties.

```js
const brand = new WeakSet();

class C {
  constructor() {
    brand.add(this);
  }

  get scoped() {
    if (!brand.has(this)) {
      throw new TypeError("Illegal invocation");
    }

    return this.hasAttribute("scoped");
  }
  set scoped(value) {
    if (!brand.has(this)) {
      throw new TypeError("Illegal invocation");
    }

    if (value) {
      this.setAttribute("scoped", "");
    } else {
      this.removeAttribute("scoped");
    }
  }
}
```

There are, however, advantages and disadvantages to this approach.

**Advantages**

- We don't need to think about anything that hasn't passed our carefully vetted
  `handleNewHTMLStyleElement()` function (represented in the example by the
  `constructor()`). This is good because we could rely on private data (like
  `scopedId` or other private things) being initialized.
- It actively forces the user to be concious of where they intend to use this
  polyfill. The main `document` object might be automagically 🧙‍♂️ hydrated with
  `enableInDocument(document)`, but if they want to use it in another document,
  they need to be explicit about it.

**Disadvantages**

- It adds more checks to the code. This can bloat things up a bit. With gzip,
  however, this shouldn't be much of a problem since it is literally the same
  thing over and over again.
- It telegraphs that this is, in fact, a polyfill-ish shim and doesn't
  _completely_ fill in original behaviour.

## Flash-of-unstyled-content (FOUC) before the polyfill is loaded

This is a problem that is inherent to the polyfill. The polyfill needs to be
loaded before the `<style>` elements are parsed. This is because the polyfill
needs to hook into the creation of the `<style>` elements to observe them for
attribute changes.

We also need to process the CSSOM before it gets applied to the document on the
first paint. This is because we need to prefix all the selectors with the
`scopedId` before the browser applies them to the document. If we aren't able to
do that, then the `<style scoped>` isn't really _scoped_ now is it?

There are two solutions to this problem:

1. Use a blocking `<script>` _non-ESM_ tag. This solves the render blocking
   problem, but doesn't allow the browser to do anything else. This is bad for
   site performance.
2. Use `<script type="module" render="blocking">` with the new
   [`render="blocking"`] directive. This is a new directive that allows the
   browser to block the rendering of the page until the module is loaded and
   executed. This is good for loading performance, but it's still a blocking
   script. This isn't supported much at the moment either.
3. 🧪 Use a custom `<style-scoped>` or other custom HTML tag that isn't
   interpreted as CSS on the first paint, thus not affecting anything. This
   would mean that the scoped content would be unstyled on the first paint, but
   it also solves the issue of such styles being _not scoped_.

Example of a user using solution 1:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://unpkg.com/scoped-style/dist/global.umd.js"></script>
  </head>
  <body>
    <div>
      <style scoped>
        p {
          color: red;
        }
      </style>
      <p>I am red!</p>
    </div>
    <p>I am default colored!</p>
  </body>
</html>
```

Example of a user using solution 2:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script
      type="module"
      render="blocking"
      src="https://unpkg.com/scoped-style/dist/global.js"
    ></script>
  </head>
  <body>
    <div>
      <style scoped>
        p {
          color: red;
        }
      </style>
      <p>I am red!</p>
    </div>
    <p>I am default colored!</p>
  </body>
</html>
```

Example of a user using solution 3: \
_🧪 Implementation not yet available_

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script
      type="module"
      render="blocking"
      src="https://unpkg.com/scoped-style/dist/custom-element.js"
    ></script>
  </head>
  <body>
    <div>
      <!-- <style-scoped> or <style-x scoped> or something else? -->
      <style-scoped> p { color: red; } </style-scoped>
      <p>I am red!</p>
    </div>
    <p>I am default colored!</p>
  </body>
</html>
```

## Using `div` when `<div>` is the scoped root

<div align="center">

![](https://i.imgur.com/NgPp3sL.png)

</div>

We need to make sure that instead of prefixing just the selectors, we also add a
second copy of the selector that has the qualifying selector as an extra own
condition, not a parent condition.

```html
<div>
  <style scoped>
    div {
      background-color: blue;
    }
  </style>
</div>

<!-- Rewritten to: -->

<div scoped-id="3e51">
  <style scoped>
    /* This won't do anything! We need to add something else... */
    [scoped-id="3e51"] div {
      background-color: blue;
    }
  </style>
</div>

<!-- Needs to be: -->

<div scoped-id="3e51">
  <style scoped>
    /* Now this will make the parent <div> blue like it should. */
    [scoped-id="3e51"] div,
    div[scoped-id="3e51"] {
      background-color: blue;
    }
  </style>
</div>
```

## Using `div + p` when `<p>` is the scoped root

Which HTML tree should work to make the `<p>` red?

```html
<!-- A -->
<div>
  <style scoped>
    div + p {
      color: red;
    }
  </style>
</div>
<p>Make me red!</p>
```

```html
<!-- B -->
<div></div>
<p>
  <style scoped>
    div + p {
      color: red;
    }
  </style>
  Make me red!
</p>
```

The [`@scope`] implementation in Chrome Canary with the code shown below works,
but if we move the `<style>` inside the `<div>`, it doesn't.

```html
<!-- Works! -->
<div></div>
<p>
  <style>
    @scope {
      div + p {
        color: red;
      }
    }
  </style>
  Make me red!
</p>
```

```html
<!-- Does NOT work! -->
<div>
  <style>
    @scope {
      div + p {
        color: red;
      }
    }
  </style>
</div>
<p>Make me red!</p>
```

The equivalent prefixed CSS would be:

```html
<!-- Works! -->
<div></div>
<p scoped-id="58af">
  <style scoped>
    [scoped-id="58af"] div + p,
    div + p[scoped-id="58af"] {
      color: red;
    }
  </style>
  Make me red!
</p>
```

```html
<!-- Does NOT work -->
<div scoped-id="3a94">
  <style scoped>
    [scoped-id="3a94"] div + p,
    div + p[scoped-id="3a94"] {
      color: red;
    }
  </style>
</div>
<p>Make me red!</p>
```

Make sure that whatever generator algorithm is used respects this edge case.

## Reading `style.sheet.cssRules[0].selectorText` and friends

⚠️ This is an open question. I don't know if we should do this or not.

When mutating the `.selectorText` of all the CSS rules, should we also add an
own property to emulate the original `.selectorText`?

```js
const style = document.createElement("style");
style.scoped = true;
style.textContent = "p { color: red; }";
document.head.append(style);

// What should this print?
console.log(style.sheet.cssRules[0].selectorText);
//=> '<custom-complex-selector>' OR 'p'
```

## Mutating the `CSSStyleSheet` object directly

⚠️ This is an open question. I don't know if we should do this or not.

Should user code updates to the `CSSStyleSheet` object be reflected in the
scoped CSS?

```js
const style = document.createElement("style");
style.scoped = true;
style.textContent = "p { color: red; }";
document.head.append(style);

// What should this do?
style.sheet.cssRules.insertRule("div { color: blue; }");
```

<!-- prettier-ignore-start -->
[`render="blocking"`]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-blocking
[`@scope`]: https://drafts.csswg.org/css-cascade-6/#scope-atrule
<!-- prettier-ignore-end -->
