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

suite('scoped', function() {

  function element(name, textContent) {
    var el = document.createElement(name);
    el.textContent = textContent || '';
    return el;
  }

  function scoped(css) {
    var s = element('style', css);
    s.scoped = true;
    return s;
  }

  /**
   * Since our logic runs inside MutationObserver, we need a microtask to observe most things.
   */
  function task(fn, done) {
    Promise.resolve(true).then(() => {
      fn();
      done && done();
    }).catch((err) => done(err));
  }

  var holder;

  setup(function() {
    holder = document.createElement('div');
    document.body.appendChild(holder);
  });
  teardown(function() {
    holder.textContent = '';
    document.body.removeChild(holder);
    holder = null;
  });

  suite('rewrite', function() {
    const rewrite = (description, source, expected) => {
      test(description, function(done) {
        var s = scoped(source + ' {}');
        holder.appendChild(s);

        task(() => {
          const rules = Array.from(s.sheet.rules);
          const actual = rules.map((rule) => rule.selectorText).join('\n');
          assert.equal(actual, expected);
        }, done);
      });
    };

    // TODO: These tests rely on order, as the polyfill uses an incrementing counting for prefixes.

    rewrite('rewrite test', 'h1', '[__scoped_1] h1');
    rewrite('many selectors', 'h1, h2', '[__scoped_2] h1, [__scoped_2] h2');
    rewrite(':scope rewrite', '.foo, h1:scope, h2:scope:not(.bar)', '[__scoped_3] .foo, h1[__scoped_3], h2[__scoped_3]:not(.bar)');
    rewrite('unsupported inner :scope', '.foo:-webkit-any(h1:scope, h4, h3:scope):not([foo])', ':not(*)');
    rewrite('tricky without :scope', '.foo:-webkit-any(h1, h4, h3):not([foo])', '[__scoped_5] .foo:-webkit-any(h1,h4,h3):not([foo])');
    rewrite('duplicate :scope rewrite', 'h2:scope:scope', 'h2[__scoped_6][__scoped_6]');
  });

  suite('apply', function() {

    test(':scope', function(done) {
      var s = scoped(':scope { background: red; }');
      holder.appendChild(s);

      task(() => {
        var computed = window.getComputedStyle(holder);
        assert.equal(computed.backgroundColor, 'rgb(255, 0, 0)', 'scope is changed');

        computed = window.getComputedStyle(document.documentElement);
        assert.notEqual(computed.backgroundColor, 'rgb(255, 0, 0)', ':root remains unchanged');
      }, done);
    });

    test('invalid :scope', function(done) {
      var s = scoped('div :scope { background: red; }');
      holder.appendChild(s);

      task(() => {
        var computed = window.getComputedStyle(document.documentElement);
        assert.notEqual(computed.backgroundColor, 'rgb(255, 0, 0)', ':root remains unchanged');
      }, done);
    });

    test('microtask run', function(done) {
      var s = scoped('h1 { color: red; }');

      var h1 = element('h1', 'first');
      holder.appendChild(h1);

      var computed = window.getComputedStyle(h1);
      assert.notEqual(computed.color, 'rgb(255, 0, 0)', 'style should be normal before insertion');

      task(() => {
        holder.appendChild(s);
        assert.equal(computed.color, 'rgb(255, 0, 0)', 'changed after insertion');
      }, done);
    });

    test('doesn\'t effect others', function(done) {
      var branch = element('div');
      holder.appendChild(branch);

      var unchanged = element('h1', 'unchanged');
      holder.appendChild(unchanged);

      var targeted = element('h1', 'targeted');
      branch.appendChild(targeted);

      // only elements in the scoped branch should change
      branch.appendChild(scoped('h2, h1 { color: red; }'));

      task(() => {
        var computed = window.getComputedStyle(unchanged);
        assert.notEqual(computed.color, 'rgb(255, 0, 0)', 'untargeted element should not be modified');

        var computed = window.getComputedStyle(targeted);
        assert.equal(computed.color, 'rgb(255, 0, 0)');
      }, done);
    });

  });

});