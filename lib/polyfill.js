'use strict';

// This monstrosity matches any valid `[foo="bar"]` block, with either quote style. Parenthesis
// have no special meaning within an attribute selector, and the complex regexp below mostly
// exists to allow \" or \' in string parts (e.g. `[foo="b\"ar"]`).
const attrRe = /^\[.*?(?:(["'])(?:.|\\\1)*\1.*)*\]/;
const walkSelectorRe = /([([,]|:scope\b)/;  // "interesting" setups
const scopeRe = /^:scope\b/;

const s = document.createElement('style');
// are we in old IE/Firefox mode, where .selectorText can't be changed inline?
s.textContent = '.x{color:red;}';
document.head.appendChild(s);
s.sheet.cssRules[0].selectorText = '.change';
const writeMode = s.sheet.cssRules[0].selectorText === '.change';
document.head.removeChild(s);

const scopedCSSOptions = {
  'applyToClass': false,
  'prefix': '__scoped_',
};

Object.defineProperty(HTMLStyleElement.prototype, 'scoped', {
  enumerable: true,
  get() {
    return this.hasAttribute('scoped');
  },
  set(v) {
    if (v) {
      this.setAttribute('scoped', this.getAttribute('scoped') || '');
    } else {
      this.removeAttribute('scoped');
    }
  },
});

/**
 * @type {!Map<!HTMLStyleElement, {attrName: string, prefix: string, parent: !HTMLElement}>}
 */
const styleNodes = new Map();

/**
 * Consumes a single selector from candidate selector text, which may contain many.
 *
 * @param {string} raw selector text
 * @return {?{selector: string, rest: string}}
 */
function consumeSelector(raw, prefix) {
  let i = raw.search(walkSelectorRe);
  if (i === -1) {
    // found literally nothing interesting, success
    return {
      selector: `${prefix} ${raw}`,
      rest: '',
    };
  } else if (raw[i] === ',') {
    // found comma without anything interesting, yield rest
    return {
      selector: `${prefix} ${raw.substr(0, i)}`,
      rest: raw.substr(i + 1),
    }
  }

  let leftmost = true;   // whether we're past a descendant or similar selector
  let scope = false;     // whether :scope has been found + replaced
  i = raw.search(/\S/);  // place i after initial whitespace only

  let depth = 0;
outer:
  for (; i < raw.length; ++i) {
    const char = raw[i];
    switch (char) {
      case '[':
        const match = attrRe.exec(raw.substr(i));
        i += (match ? match[0].length : 1) - 1;  // we add 1 every loop
        continue;

      case '(':
        ++depth;
        continue;

      case ':':
        if (!leftmost) {
          continue;  // doesn't matter if :scope is here, it'll always be ignored
        } else if (!scopeRe.test(raw.substr(i))) {
          continue;  // not ':scope', ignore
        } else if (depth) {
          return null;
        }

        // Replace ':scope' with our prefix. This can happen many times; ':scope:scope' is valid.
        // It will never apply to a descendant selector (e.g., ".foo :scope") as this is ignored
        // by browsers anyway (invalid).
        raw = raw.substring(0, i) + prefix + raw.substr(i + 6);
        i += prefix.length;
        scope = true;
        --i;  // we'd skip over next character otherwise
        continue;  // run loop again

      case ')':
        if (depth) {
          --depth;
        }
        continue;
    }
    if (depth) {
      continue;
    }

    switch (char) {
      case ',':
        break outer;

      case ' ':
      case '>':
      case '~':
      case '+':
        if (!leftmost) {
          continue;
        }
        leftmost = false;
    }
  }

  const selector = (scope ? '' : `${prefix} `) + raw.substr(0, i);
  return {selector, rest: raw.substr(i + 1)};
}

function updateSelectorText(selectorText, prefix) {
  const found = [];

  while (selectorText) {
    const consumed = consumeSelector(selectorText, prefix);
    if (consumed === null) {
      return ':not(*)';
    }
    found.push(consumed.selector);
    selectorText = consumed.rest;
  }

  return found.join(', ');
}


/**
 * Upgrades a specific CSSRule.
 *
 * @param {!CSSRule} rule
 * @param {string} prefix to apply
 * @param {!CSSMediaRule|!CSSStyleSheet} group
 * @param {number} index in group
 */
function upgradeRule(rule, prefix, group, index) {
  if (rule instanceof CSSMediaRule) {
    // upgrade children
    const l = rule.cssRules.length;
    for (let j = 0; j < l; ++j) {
      upgradeRule(rule.cssRules[j], prefix, rule, j);
    }
    return;
  }

  if (!(rule instanceof CSSStyleRule)) {
    return;  // unknown rule type, ignore
  }

  const update = updateSelectorText(rule.selectorText, prefix);

  if (writeMode) {
    // anything but old IE/Firefox
    rule.selectorText = update;
  } else {
    // old browsers which don't allow modification of selectorText
    const cssText = rule.style.cssText;  // save before we delete
    group.deleteRule(index);
    group.insertRule(`${update} {${cssText}}`, index);
  }
}


/**
 * @param {!CSSRule} rule
 * @return {Node} owner of rule
 */
function ownerNode(rule) {
  let sheet = rule.parentStyleSheet;
  while (sheet) {
    if (sheet.ownerNode) {
      return sheet.ownerNode;
    }
    sheet = sheet.parentStyleSheet;
  }
  return null;
}


/**
 * Replaces a live rule, returning the new `CSSRule` that it was replaced with.
 *
 * @param {!CSSRule} rule
 * @param {string} update to replace with
 * @return {!CSSRule}
 */
function replaceRule(rule, update) {
  const parent = rule.parentStyleSheet;
  let i;
  for (i = 0; i < parent.rules.length; ++i) {
    if (parent.rules[i] === rule) {
      break;
    }
  }
  parent.removeRule(i);
  parent.insertRule(update, i);

  return parent.rules[i];
}


/**
 * @param {!CSSStyleSheet} sheet
 * @return {?{code: number}} the DOMException found while accessing this CSS
 */
function sheetRulesError(sheet) {
  // FIXME: This monstrosity just convinces Closure that `sheet.cssRules` has side-effects.
  let rules = null;
  try {
    rules = sheet.cssRules;
  } catch (e) {
    if (e instanceof DOMException) {
      return e;
    }
    throw e;
  }
  if (rules) {
    return null;
  }

  // Safari no longer throws an error here, just pretend we can't read the data.
  return {code: DOMException.SECURITY_ERR};
}

// TODO: upgradeSheet could return a Promise or then-like

/**
 * @param {!CSSStyleSheet} sheet already loaded CSSStyleSheet
 * @param {string} prefix to apply
 * @return {boolean} if applied immediately
 */
const upgradeSheet = (function() {

  /** @type {!WeakMap<!StyleSheet, string>} */
  const upgradedSheets = new WeakMap();

  /** @type {!Map<!CSSImportRule, string>} */
  const pendingImportRule = new Map();

  /** @type {!Map<!CSSStyleSheet, string>} */
  const pendingInvalidSheet = new Map();

  /**
   * Callback inside rAF to monitor for @import-style loading or for parsing CSS script tags.
   * This is ugly, but only happens on styles that are moved or inserted dynamically (static
   * styles all fire at once).
   */
  const requestCheck = (function() {
    let rAF = 0;

    function check() {
      let again = false;
      rAF = 0;

      pendingImportRule.forEach((prefix, importRule) => {
        if (importRule.styleSheet) {
          internalUpgrade(importRule.styleSheet, prefix);
        } else if (ownerNode(importRule)) {
          again = true;
          return;  // still valid, do nothing
        }
        pendingImportRule.delete(importRule);
      });

      pendingInvalidSheet.forEach((prefix, sheet) => {
        if (sheetRulesError(sheet)) {
          again = true;
          return;
        }
        internalUpgrade(sheet, prefix);
        pendingInvalidSheet.delete(sheet);
      });

      // check again next frame
      if (again) {
        rAF = window.requestAnimationFrame(check);
      }
    }

    return function() {
      rAF = rAF || window.requestAnimationFrame(check);
    };
  }());

  /**
   * @param {!CSSStyleSheet} sheet
   * @param {string} prefix
   */
  function internalUpgrade(sheet, prefix) {
    if (upgradedSheets.get(sheet) === prefix) {
      return;  // already done
    }

    const e = sheetRulesError(sheet);
    if (e) {
      switch (e.code) {
        case DOMException.SECURITY_ERR:
          // Occurs if we try to examine a cross-domain CSS file. Fetch it ourselves and update
          // the CSS once it is available on a 'local' URL.
          const x = new XMLHttpRequest();
          x.responseType = 'blob';
          x.open('GET', sheet.href);

          // This must also be replaced with a temporary @import, as @import must all appear
          // first. Use a base64 URL that doesn't actually contain anything.
          const rule = replaceRule(
              /** @type {!CSSRule} */ (sheet.ownerRule),
              `@import url('data:text/css;base64,')`
          );

          x.onload = () => {
            const url = URL.createObjectURL(/** @type {!Blob} */ (x.response));
            const update = /** @type {!CSSImportRule} */ (replaceRule(rule, `@import '${url}'`));
            pendingImportRule.set(update, prefix);
            requestCheck();

            // We can revoke this URL immediately as it's seemingly read synchronously.
            URL.revokeObjectURL(url);
          };
          // nb. no onerror handling

          x.send();
          return;

        case DOMException.INVALID_ACCESS_ERR:
          // This occurs in Firefox if the CSS is yet to be parsed (for dynamic cases), see:
          //   https://bugzilla.mozilla.org/show_bug.cgi?id=761236
          pendingInvalidSheet.set(sheet, prefix);
          requestCheck();
          return;

        default:
          throw e;
      }
    }

    // Hooray, the sheet is ready to go!
    upgradedSheets.set(sheet, prefix);

    const l = sheet.cssRules.length;
    for (let i = 0; i < l; ++i) {
      const rule = sheet.cssRules[i];

      if (!(rule instanceof CSSImportRule)) {
        upgradeRule(rule, prefix, sheet, i);
        continue;
      }

      if (rule.styleSheet) {
        // TODO: recursion is bad
        internalUpgrade(rule.styleSheet, prefix);
        continue;
      }

      // otherwise, add to pending queue
      pendingImportRule.set(rule, prefix);
      requestCheck();
    }

    return true;
  }

  return internalUpgrade;
}());


/**
 * @param {!HTMLStyleElement} node to reset
 */
function resetCSS(node) {
  const css = node.textContent;
  node.textContent = '';
  node.textContent = css;
}


function applyToAttr(node, attrName, apply) {
  // default version is to apply to attributes
  if (apply) {
    node.setAttribute(attrName, '');
  } else {
    node.removeAttribute(attrName);
  }
}

function applyToClass(node, attrName, apply) {
  if (apply) {
    node.classList.add(attrName);
  } else {
    node.classList.remove(attrName);
  }
}


let applyMode = applyToAttr;
let uniqueId = 0;


function upgrade(node) {
  const effectiveParent = node['scoped'] && document.body.contains(node) ? node.parentNode : null;

  const state = styleNodes.get(node);
  if (state) {
    if (!effectiveParent) {
      // disappearing, clear state and ask browser to reset CSS
      styleNodes.delete(node);
      resetCSS(node);
    } else if (node.sheet) {
      // otherwise, upgrade the sheet (succeeds if already done)
      // nb. node.sheet is null if being removed
      upgradeSheet(node.sheet, state.prefix);
    }

    if (state.parent !== effectiveParent) {
      state.parent && applyMode(state.parent, state.attrName, false);
      effectiveParent && applyMode(effectiveParent, state.attrName, true);
      state.parent = effectiveParent;
    }

    return false;  // already upgraded
  }

  if (!effectiveParent) {
    return;  // not scoped CSS, never seen before, ignore
  }

  // TODO: use hash for deduping
  // const hash = hashCode(node.textContent);

  // newly found style node, setup attr
  const attrName = `${scopedCSSOptions['prefix']}${++uniqueId}`;
  const prefix = applyMode === applyToAttr ? `[${attrName}]` : `.${attrName}`;
  styleNodes.set(node, {attrName, prefix, parent: node.parentNode});

  upgradeSheet(node.sheet, prefix);
  applyMode(effectiveParent, attrName, true);
}

// this mess basically calls resolve() with any <style> nodes that changed/removed/added
// TODO: is it faster to just call getElementsByTagName('style') and compare to previous
const mo = new MutationObserver((records) => {
  const changes = new Set();
  const iterate = (nodes) => {
    let i = nodes ? nodes.length : 0;
    while (i) {
      const node = nodes[--i];
      if (!(node instanceof HTMLElement)) {
        continue;  // text node
      }
      if (node instanceof HTMLStyleElement) {
        changes.add(node);  // directly a <style>
        continue;
      }
      // look for changed children
      const cand = node.getElementsByTagName('style');
      let j = cand.length;
      while (j) {
        changes.add(cand[--j]);
      }
    }
  };

  records.forEach((record) => {
    if (record.target instanceof HTMLStyleElement) {
      changes.add(record.target);
    } else {
      iterate(record.addedNodes);
      iterate(record.removedNodes);
    }
  });

  changes.forEach(upgrade);
});

function setup() {
  // clone any options from global
  const cand = window['scopedCSS'];
  if (typeof cand === 'object') {
    for (let k in scopedCSSOptions) {
      if (k in cand) {
        scopedCSSOptions[k] = cand[k];
      }
    }

    if (scopedCSSOptions['applyToClass']) {
      applyMode = applyToClass;
    }
  }

  // nb. watch for attributeFilter: ['scoped'] to detect a CSS rule changing at runtime
  const options = {childList: true, subtree: true, attributes: true, attributeFilter: ['scoped']};
  mo.observe(document, options);
  const collection = document.body.getElementsByTagName('style');
  for (let i = 0; i < collection.length; ++i) {
    upgrade(collection[i]);
  }
}

/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

console.log("scoped");

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}
