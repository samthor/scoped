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
    });
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

  test('basic', function(done) {
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

    branch.appendChild(element('h1', 'branch'));
    branch.appendChild(scoped('h1 { color: blue; }'));

    task(() => {
      var normal = element('h1', 'normal');
      holder.appendChild(normal);
      var computed = window.getComputedStyle(normal);
      assert.equal(computed.color, 'rgb(0, 0, 0)', 'remains changed');
    }, done);
  });

});