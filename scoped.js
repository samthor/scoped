/**
 * @fileoverview Polyfill for `<style scoped>`.
 */

(function() {
  const s = document.createElement('style');
  if ('scoped' in s) {
    return;  // do nothing
  }

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
   * @type {!WeakMap<!HTMLStyleElement, *>}
   */
  const styleNodes = new WeakMap();




  function hashCode(s) {
    let hash = 5381;
    let j = s.length;
    while (j) {
      hash = (hash * 33) ^ s.charCodeAt(--j);
    }
    return hash;
  }



  /**
   * @param {!CSSStyleSheet} sheet
   * @param {string} prefix
   */
  const upgradeSheet = (function() {

    /**
     * @type {!WeakMap<!StyleSheet, string>}
     */
    const upgradedSheets = new WeakMap();

   /**
    * @type {!Map<!CSSImportRule, string>}
    */
    const pendingImportRule = new Map();

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
     * Callback inside rAF to monitor for sheet loading.
     */
    function process() {
      pendingImportRule.forEach((prefix, importRule) => {
        if (importRule.styleSheet) {
          internalUpgrade(importRule.styleSheet, prefix);
        } else if (ownerNode(importRule)) {
          return;  // still valid, do nothing
        }
        pendingImportRule.delete(importRule);
      });
      // check again next frame
      pendingImportRule.size && window.requestAnimationFrame(process);
    }

    /**
     * @param {!CSSStyleSheet} sheet already loaded CSSStyleSheet
     * @param {string} prefix to apply
     */
    function internalUpgrade(sheet, prefix) {
      if (upgradedSheets.get(sheet) === prefix) {
        return;  // already done
      }
      upgradedSheets.set(sheet, prefix);

      const l = sheet.rules.length;
      for (let i = 0; i < l; ++i) {
        const rule = sheet.rules[i];

        if (rule instanceof CSSImportRule) {
          if (rule.styleSheet) {
            // TODO: recursion is bad
            internalUpgrade(rule.styleSheet, prefix);
            continue;
          }

          // otherwise, add to pending queue
          if (!pendingImportRule.size) {
            window.requestAnimationFrame(process);
          }
          pendingImportRule.set(rule, prefix)

        } else if (rule instanceof CSSStyleRule) {
          rule.selectorText = prefix + rule.selectorText;
        } else {
          console.warning('unhandled rule', rule);
        }
      }
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
        console.info('style', state.attrName, 'now on', effectiveParent);
      }

      return false;  // already upgraded
    }

    if (!effectiveParent) {
      return;  // not scoped CSS, never seen before, ignore
    }

    // TODO: use hash for deduping
    const hash = hashCode(node.textContent);

    // newly found style node, setup attr

    const attrName = `__scope_${++uniqueId}`
    const prefix = `[${attrName}] `;
    styleNodes.set(node, {attrName, prefix, parent: node.parentNode});

    upgradeSheet(node.sheet, prefix);
    effectiveParent.setAttribute(attrName, '');
  }


  /**
   * @param {!Set<!HTMLStyleElement>|!NodeList}
   */
  function resolve(changes, opt_dirty) {
    console.info('got potential changes', [...changes]);

    [...changes].forEach(upgrade);
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

  const options = {childList: true, subtree: true, attributes: true, attributeFilter: ['scoped']};
  mo.observe(document.body, options);
  resolve(document.getElementsByTagName('style'));

}());