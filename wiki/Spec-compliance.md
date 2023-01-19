This polyfill follows an outdated version of the HTML specification from May
5, 2016. The [old spec] is available on [archive.org].

There's not much spec text devoted to describing how the `<style scoped>` tag
works, but here's the relevant details:

> scoped — Whether the styles apply to the entire document or just the parent
> subtree
>
> The scoped attribute is a boolean attribute. If present, it indicates that the
> styles are intended just for the subtree rooted at the style element's parent
> element, as opposed to the whole Document.
>
> If the scoped attribute is present and the element has a parent element, then
> the style element must precede any flow content in its parent element other
> than inter-element whitespace and other style elements, and the parent
> element's content model must not have a transparent component.
>
> Note: This implies that scoped style elements cannot be children of, e.g., a
> or ins elements, even when those are used as flow content containers.
>
> Note: A style element without a scoped attribute is restricted to appearing in
> the head of the document.
>
> A style sheet declared by a style element that has a scoped attribute and has
> a parent node that is an element is scoped, with the scoping root being the
> style element's parent element.

Specificaly, the differences between the normal `<style>` and `<style scoped>`
(that this polyfill should implement) are:

- If the `<style>` tag is scoped, `:scope` refers to its parent element
- If the `<style>` tag is scoped, all CSS selectors are scoped to its parent
  element

## Other resources

Here's some other websites that have information about the `<style scoped>`
feature:

- [Remove \<style scoped> #552](https://github.com/whatwg/html/issues/552)
- [MDN \<style> (archive from Dec 8, 2015)](https://web.archive.org/web/20151208031613/https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style)
- [A new experimental feature - scoped stylesheets](https://developer.chrome.com/blog/a-new-experimental-feature-style-scoped/)

<!-- prettier-ignore-start -->
[old spec]: https://web.archive.org/web/20160505103205/https://html.spec.whatwg.org/multipage/semantics.html#the-style-element
[archive.org]: https://archive.org/
<!-- prettier-ignore-end -->
