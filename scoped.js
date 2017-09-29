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

/**
 * @fileoverview Polyfill for `<style scoped>`.
 */

(function() {
  const s = document.createElement('style');
  if ('scoped' in s) {
    return;  // do nothing
  }

  // are we in "Firefox mode", where .selectorText can't be changed inline?
  s.textContent = '.style-test { color: red; }';
  document.head.appendChild(s);
  s.sheet.cssRules[0].selectorText = '.change';
  const writeMode = s.sheet.cssRules[0].selectorText === '.change';
  document.head.removeChild(s);


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


  function hashCode(s) {
    let hash = 5381;
    let j = s.length;
    while (j) {
      hash = (hash * 33) ^ s.charCodeAt(--j);
    }
    return hash;
  }


  /**
   * Upgrades a specific CSSRule.
   *
   * @param {!CSSRule} rule
   * @param {string} prefix to apply
   * @param {!CSSGroupingRule|!CSSStyleSheet} group
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
      console.warn(`can't scope rule'`, rule);
      return;
    }

    // Chrome and others
    if (writeMode) {
      rule.selectorText = prefix + rule.selectorText;
      return;
    }

    // Firefox and others which don't allow modification of selectorText
    const text = rule.cssText;
    group.deleteRule(index);
    group.insertRule(prefix + text, index);
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
   * @param {!CSSStyleSheet} sheet
   * @return {boolean} whether it would be an error to access its cssRules property
   */
  function sheetRulesError(sheet) {
    try {
      sheet.cssRules;
    } catch (e) {
      if (e instanceof DOMException) {
        return true;
      }
      throw e;
    }
    return false;
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

    function internalUpgrade(sheet, prefix) {
      if (upgradedSheets.get(sheet) === prefix) {
        return;  // already done
      }

      if (sheetRulesError(sheet)) {
        // this throws DOMException in Firefox if the CSS isn't parsed yet
        // see: https://bugzilla.mozilla.org/show_bug.cgi?id=761236
        pendingInvalidSheet.set(sheet, prefix);
        requestCheck();
        return false;
      }

      let done = true;
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
        done = false;
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


  let uniqueId = 0;


  function upgrade(node) {
    const effectiveParent = node.scoped && document.body.contains(node) ? node.parentNode : null;

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
        if (state.parent) {
          state.parent.removeAttribute(state.attrName);
        }
        if (effectiveParent) {
          effectiveParent.setAttribute(state.attrName, '');
        }
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
    const attrName = `__scope_${++uniqueId}`
    const prefix = `[${attrName}] `;
    styleNodes.set(node, {attrName, prefix, parent: node.parentNode});

    upgradeSheet(node.sheet, prefix);
    effectiveParent.setAttribute(attrName, '');
  }


  /**
   * @param {!Set<!HTMLStyleElement>|!NodeList} changes
   */
  function resolve(changes) {
    Array.from(changes).forEach(upgrade);
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

    resolve(changes);
  });

  function setup() {
    const options = {childList: true, subtree: true};
    mo.observe(document.body, options);
    resolve(document.body.getElementsByTagName('style'));
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

}());