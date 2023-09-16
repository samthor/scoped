# `<style scoped>` polyfill

🎨 Polyfill for the legacy `scoped` attribute on `<style>`

⚠️ As of September 2023, [Chrome supports the modern `@scope` selector](https://www.bram.us/2023/08/22/a-quick-introduction-to-css-scope/) with more browsers likely to come&mdash;you should use this instead

<div align="center">

[![](https://thum.io/get/crop/600/https://codesandbox.io/embed/5ocrf8)](https://codesandbox.io/s/5ocrf8)

</div>

📜 Use old-but-working proposal until `@scope` gets here \
💻 Works in all browsers \
🥇 Uses fast regex to parse CSS selectors \
⚠️ Doesn't support super complex queries with `:scope` \
⚖️ 4kb minzipped

This polyfill is based on the `scoped` attribute as defined by the HTML spec in
early 2016. This section of the spec has since been removed. You can still [view
it on archive.org] though! It's successor is likely to be the [`@scope`
at-rule]. Use at your own risk.

## Installation

![npm](https://img.shields.io/static/v1?style=for-the-badge&message=npm&color=CB3837&logo=npm&logoColor=FFFFFF&label=)
![jsDelivr](https://img.shields.io/static/v1?style=for-the-badge&message=jsDelivr&color=E84D3D&logo=jsDelivr&logoColor=FFFFFF&label=)

🪀 Want to try it right now with no setup? [Try it on CodeSandbox]!

The best way to install this package on your website is to use a CDN. We provide
a global classic _non-module_ build that can be loaded directly from
[unpkg.com]. You can also download and bundle it locally using npm if you want.

```html
<script src="https://unpkg.com/style-scoped/scoped.min.js"></script>
```

```sh
npm install style-scoped
```

👷‍♂️ In the future we may provide an ESM bundle instead that can be used with
modern JavaScript features. For now, though, we only offer a UMD build.

### Browser support

This polyfill supports all modern browsers. It requires `WeakMap` and
`MutationObserver` support.

## Usage

![HTML5](https://img.shields.io/static/v1?style=for-the-badge&message=HTML5&color=E34F26&logo=HTML5&logoColor=FFFFFF&label=)

After loading the polyfill, you can use the `scoped` attribute on `<style>` to
restrict the scope of the CSS rules to the parent element of the `<style>` tag.

```html
<div>Hello <span>world!</span></div>
<div>
  <style scoped>
    div:scope {
      color: red;
    }
    span {
      color: green;
    }
  </style>
  Bonjour <span>monde!</span>
</div>
<div>¡Hola <span>Mundo!</span></div>
```

![](https://i.imgur.com/B2uJw5P.png)

You can also use the `:scope` pseudo-class to select the parent element of the
`<style>` tag. This lets you do things that you can't do with an inline `style`
attribute. For example, you can use `:hover` on the parent element:

```html
<a href="https://example.org/">
  <style scoped>
    :scope:hover {
      color: red;
    }
  </style>
  Go to example.org
</a>
```

⚠️ Rules which use `:scope` inside another selector (e.g. `:is(div:scope)`) are
not currently supported and will be cleared. If this is _actually something you
need_, I will eat my hat. 🎩

## How it works

TODO: Explain how it works

## Notes

- The polyfill doesn't operate on all CSS rules. `@keyframes`, `@font`, etc. are
  ignored.
- If you depend on cross-domain CSS via `@import`, this is loaded dynamically
  with an XHR. It may take a little while to arrive. (📚 [#2] & [#3])

## Development

![Codespaces](https://img.shields.io/static/v1?style=for-the-badge&message=Codespaces&color=181717&logo=GitHub&logoColor=FFFFFF&label=)
![Devcontainers](https://img.shields.io/static/v1?style=for-the-badge&message=Devcontainers&color=2496ED&logo=Docker&logoColor=FFFFFF&label=)

This project uses a [devcontainer] to provide a consistent development
environment for contributors. You can use it with [GitHub Codespaces] online, or
[VS Code] locally.

There are a few scripts you can run:

- `npm pack`: Build the project using Vite
- `npm test`: Run the tests using Vitest

🚀 These tasks are also available as [VS Code Tasks].

<!-- prettier-ignore-start -->
[`@scope` at-rule]: https://drafts.csswg.org/css-cascade-6/#scope-atrule
[unpkg.com]: https://unpkg.com/
[#2]: https://github.com/samthor/scoped/issues/2
[#3]: https://github.com/samthor/scoped/issues/3
[devcontainer]: https://code.visualstudio.com/docs/remote/containers
[github codespaces]: https://github.com/features/codespaces
[vs code]: https://code.visualstudio.com/
[vs code tasks]: https://code.visualstudio.com/docs/editor/tasks
[try it on codesandbox]: https://codesandbox.io/s/5ocrf8
[view it on archive.org]: https://web.archive.org/web/20160505103205/https://html.spec.whatwg.org/multipage/semantics.html#the-style-element
<!-- prettier-ignore-end -->
