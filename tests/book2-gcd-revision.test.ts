import assert from "node:assert/strict";
import test from "node:test";
import { lessonEdits, reviseBook2Text, taskEdits } from "../content/original/book2-gcd-revision";

test("Book 2 edits recognise the corrected fragment and reject drift or duplicate matches", () => {
  const edits = [
    ...lessonEdits.en,
    ...lessonEdits.ru,
    ...taskEdits.flatMap(({ en, ru }) => [...Object.values(en), ...Object.values(ru)]),
  ];
  for (const edit of edits) {
    const [before, after] = edit;
    assert.equal(reviseBook2Text(before, edit), after);
    assert.equal(reviseBook2Text(after, edit), after);
    assert.throws(() => reviseBook2Text("Unknown text", edit), /BOOK2_REVISION_TEXT_CONFLICT/);
    assert.throws(() => reviseBook2Text(before + before, edit), /BOOK2_REVISION_TEXT_CONFLICT/);
  }
});

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : Math.abs(a);
}

test("the edited GCD proofs account for zero and the second factor of two", () => {
  const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1);
  assert.equal(gcd(factorial(0) + 1, factorial(1) + 1), 2, "factorial example needs positive n");
  for (let n = 1; n <= 8; n++) assert.equal(gcd(factorial(n) + 1, factorial(n + 1) + 1), 1);
  const n = -2;
  assert.equal(gcd(n * n + 3 * n + 3, n * n + 5 * n + 7), 1, "task 9 includes m = 0");
  for (let a = -8; a <= 8; a++) {
    for (let b = -8; b <= 8; b++) {
      if (gcd(a, b) !== 1) continue;
      const expected = a % 2 && b % 2 ? 2 : 1;
      assert.equal(gcd(a + b, a * a + b * b), expected);
      assert.equal(gcd(a + b, a ** 6 + b ** 6), expected);
    }
  }
});
