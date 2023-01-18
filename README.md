# `<style scoped>` polyfill

🎨 Polyfill for the `scoped` attribute on `<style>`

<div align="center">

![](https://i.imgur.com/z56LgrG.png)

</div>

📜 Use old-but-working proposal until `@scope` gets here \
💻 Works in all browsers \
🥇 Uses fast regex to parse CSS selectors \
⚠️ Doesn't support super complex queries with `:scope` \
⚖️ 4kb minzipped

This polyfill is based on the [`<style>` `scoped` attribute] as defined by the
[WHATWG HTML specification] in early 2016. This section of the spec has since
been removed. It's successor is likely to be the [`@scope` at-rule]. Use at your
own risk.

## Installation

![npm](https://img.shields.io/static/v1?style=for-the-badge&message=npm&color=CB3837&logo=npm&logoColor=FFFFFF&label=)
![jsDelivr](https://img.shields.io/static/v1?style=for-the-badge&message=jsDelivr&color=E84D3D&logo=jsDelivr&logoColor=FFFFFF&label=)

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

<!--
You must use direct <img> tags so that they don't get wrapped in <p> tags with
margins. The <pre> tags are fine, though. They don't ever get wrapped with <p>.
-->
<table><tr><td>

<!-- prettier-ignore -->
```html
<div>Hello <span>world!</span></div>
<div>
  <style>
    div  { color: red;   }
    span { color: green; }
  </style>
  Bonjour <span>monde!</span>
</div>
<div>¡Hola <span>Mundo!</span></div>
```

</td><td>

<img src="https://source.unsplash.com/random/400x250?1" />

</td></tr><tr><td>

<!-- prettier-ignore -->
```html
<div>Hello <span>world!</span></div>
<div>
  <style scoped>
    div  { color: red;   }
    span { color: green; }
  </style>
  Bonjour <span>monde!</span>
</div>
<div>¡Hola <span>Mundo!</span></div>
```

</td><td>

<img src="https://source.unsplash.com/random/400x250?2" />

</td></tr></table>

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

### Configuration

If `window.scopedCSS` is defined before the polyfill is loaded, it accepts two
options:

- `scopedCSS.applyToClass` (default `false`): if true, the polyfill will use a
  class, not an attribute
- `scopedCSS.prefix`: a custom prefix for the attribute or class name set on the
  scope

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

- `npm pack --dry-run`: Build the project using Vite
- `npm test`: Run the tests using Vitest

🚀 These tasks are also available as VS Code [Tasks].

<!-- prettier-ignore-start -->
[`<style>` `scoped` attribute]: https://web.archive.org/web/20160406090801/https://html.spec.whatwg.org/#attr-style-scoped
[whatwg html specification]: https://html.spec.whatwg.org/
[`@scope` at-rule]: https://drafts.csswg.org/css-cascade-6/#scope-atrule
[unpkg.com]: https://unpkg.com/
[#2]: https://github.com/samthor/scoped/issues/2
[#3]: https://github.com/samthor/scoped/issues/3
[devcontainer]: https://code.visualstudio.com/docs/remote/containers
[github codespaces]: https://github.com/features/codespaces
[vs code]: https://code.visualstudio.com/
[tasks]: https://code.visualstudio.com/docs/editor/tasks
<!-- prettier-ignore-end -->
