/**
 * This function takes a selector and a condition selector, and returns a new
 * selector that will match the same elements as the original, but scoped to the
 * elements that the condition selector matches.
 *
 * @example
 * ```js
 * const scoped = selectorScopedToCondition(
 *   "div",
 *   "[scoped-id='123']"
 * );
 * console.log(scoped);
 * //=> "[scoped-id='123'] div, div[scoped-id='123']"
 * ```
 *
 * @param selectorText This should be a valid CSS selector. It may contain
 * string literals, function-like expressions, etc. Just make sure it's valid
 * CSS. Anything that you got from `.selectorText` should be fine.
 * @param simpleSelectorCondition A CSS condition - a simple selector
 * **suffix**. That means `[attr]`, `:pseudo`, `.class`, and `#id` are fine, but
 * `my-element` is not.
 * @returns A new selector that will match the same elements as the original,
 * but scoped to the elements that the condition selector matches.
 */
export default function selectorScopedToCondition(
  selectorText: string,
  simpleSelectorCondition: string
) {
  // 1. Create placeholder storage for strings and function-like expressions.
  const strs = new Map();
  const fns = new Map();

  /**
   * The result of this regex is:
   * - Group 1: The string literal, without the quotes
   * - Entire match: The entire string literal with quotes
   *
   * The regex itself has the main `[^"]*` group, which matches any non double
   * quote character.
   *
   * TODO(@jcbhmr): Improve doubleQuotedStringRe to handle escaped quotes
   */
  const doubleQuotedStringRe = /"([^"]*)"/g;
  /**
   * The result of this regex is:
   * - Group 1: The string literal, without the quotes
   * - Entire match: The entire string literal with quotes
   *
   * The regex itself has the main `[^']*` group, which matches any non single
   * quote character.
   *
   * TODO(@jcbhmr): Improve singleQuotedStringRe to handle escaped quotes
   */
  const singleQuotedStringRe = /'([^']*)'/g;
  /**
   * The result of this regex is:
   * - Group 1: The function name
   * - Group 2: The function arguments
   * - Entire match: The entire function expression with the preceding colon
   *
   * There are two main groups in this regex:
   * 1. The `[\w-]+` group matches the function name, which is any word
   *    character (that's A-Z, a-z, 0-9, and _) or a dash.
   * 2. The `[^)]*` group matches the function arguments, which is any
   *    character that's not a closing parenthesis. This works since by the
   *    time we use this regex, we don't need to worry about quotes since
   *    we've already replaced them with placeholders.
   */
  const functionExpressionRe = /:([\w-]+)\(([^)]*)\)/g;

  // We use these regexes to replace the placeholders with their original
  // values later in step 8. They're here so that they are close in proximity
  // to the templates that create strings that must match these regexes.
  const strPlaceholderRe = /STR_[a-f0-9]{4}/g;
  const fnPlaceholderRe = /FN_[a-f0-9]{4}/g;

  // 2. Replace string literals with placeholders. This lets us split on commas
  //    without worrying about commas inside strings.
  selectorText = selectorText.replaceAll(
    doubleQuotedStringRe,
    (stringLiteral) => {
      const id = Math.random().toString(16).slice(2, 6).padStart(4, "0");
      const placeholder = `STR_${id}`;
      strs.set(placeholder, stringLiteral);
      return placeholder;
    }
  );
  selectorText = selectorText.replaceAll(
    singleQuotedStringRe,
    (stringLiteral) => {
      const id = Math.random().toString(16).slice(2, 6).padStart(4, "0");
      const placeholder = `STR_${id}`;
      strs.set(placeholder, stringLiteral);
      return placeholder;
    }
  );

  // 3. Replace all instances of :scope with the condition selector. We don't
  //    need to worry about quotes since they've already been replaced with
  //    placeholders. Since we do this before the function expression
  //    replacement, we don't need to worry about function expressions
  //    containing :scope.
  selectorText = selectorText.replaceAll(":scope", simpleSelectorCondition);

  // 4. Replace function-like expressions with placeholders. This removes
  //    internal commas just the the string placeholder step, but it also lets
  //    us post-process these expressions to deal with their own internal
  //    selector groups and (potentially) recursively call this function.
  selectorText = selectorText.replaceAll(
    functionExpressionRe,
    (fnExpression) => {
      const id = Math.random().toString(16).slice(2, 6).padStart(4, "0");
      const placeholder = `FN_${id}`;

      // In the future, we may want to post-process the arguments as their own
      // selector list. For now, we just pass them through.

      fns.set(placeholder, fnExpression);
      return placeholder;
    }
  );

  // 5. Split the selector on commas, and then scope each selector group. This
  //    needs to be let so we can re-assign it a few times.
  let selectorArray = selectorText.split(",");

  // 6. Map each selector group to a new selector group that's scoped to the
  //    condition selector.
  selectorArray = selectorArray.flatMap((selector) => [
    // A. Create one scoped selector by prefixing the condition as a parent
    //     condition. Ex: "div" => "[scoped-id='123'] div"
    simpleSelectorCondition + " " + selector,
    // B. Create another scoped selector by suffixing the condition as an
    //     additional constraint on the original CSS selector. This is why the
    //     constraint cannot be a type selector. If it were, we wouldn't be able
    //     to just append it. The [attr], .class, and :pseudo selectors are all
    //     fine, though. Ex: "div" => "div[scoped-id='123']"
    selector + simpleSelectorCondition,
  ]);

  // 7. Re-join the selector groups back together with commas.
  selectorText = selectorArray.join(", ");

  // 8. Re-insert the string literals and function expressions.
  selectorText = selectorText.replaceAll(
    strPlaceholderRe,
    (placeholder) => strs.get(placeholder)!
  );
  selectorText = selectorText.replaceAll(
    fnPlaceholderRe,
    (placeholder) => fns.get(placeholder)!
  );

  return selectorText;
}
