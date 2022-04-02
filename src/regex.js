// This monstrosity matches any valid `[foo="bar"]` block, with either quote style. Parenthesis
// have no special meaning within an attribute selector, and the complex regexp below mostly
// exists to allow \" or \' in string parts (e.g. `[foo="b\"ar"]`).
export const attrRe = /^\[.*?(?:(["'])(?:.|\\\1)*\1.*)*\]/;
export const walkSelectorRe = /([([,]|:scope\b)/;  // "interesting" setups
export const scopeRe = /^:scope\b/;