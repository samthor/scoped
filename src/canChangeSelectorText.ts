/**
 * This function checks whether the browser allows changing the `.selectorText`
 * property of a `CSSStyleRule` object.
 *
 * @remarks
 * Apparently old Firefox and IE browsers don't allow changing the
 * `.selectorText` property of a `CSSStyleRule` object. This function will later
 * determine if we use the `.selectorText` property or the `.cssText` property
 * to change the selector when we add the custom scope prefix.
 *
 * @privateRemarks
 * This function is originally based on the check that used to appear at the top
 * of `index.js` from v0.2.2.
 *
 * TODO(@jcbhmr): Determine if this function is still needed in v1.0.0 with
 * modern browsers.
 */
export default function canChangeSelectorText(): boolean {
  let style = document.createElement("style");
  style.textContent = "__canChangeSelectorText_BEFORE {}";
  document.head.append(style);
  let rule = style.sheet!.cssRules[0] as CSSStyleRule;
  rule.selectorText = "__canChangeSelectorText_AFTER";
  const changed = style.textContent === "__canChangeSelectorText_AFTER {}";
  style.remove();
  return changed;
}
