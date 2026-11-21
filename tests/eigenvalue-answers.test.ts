import assert from "node:assert/strict";
import { test } from "node:test";
import { AnswerVariableError, checkExact } from "../src/lib/exact-answer";
import { answerFormat } from "../src/lib/square-presentation";

test("eigenvalues accept a bare value, a set, and standard lambda notation", () => {
  const single = { key: "lambda", label: "Eigenvalue", type: "number", expected: "-3" };
  for (const answer of ["-3", "λ = -3", "lambda = -3", String.raw`\lambda=-3`])
    assert(checkExact(single, answer));
  const spectrum = { key: "values", label: "All eigenvalues", type: "set", expected: "{-2,5}" };
  for (const answer of ["{5,-2}", "5 or -2", "λ = 5 or λ = −2", String.raw`lambda=5 or \lambda=-2`])
    assert(checkExact(spectrum, answer));
  assert(!checkExact(spectrum, "λ = 5"));
  assert.throws(() => checkExact(spectrum, "x = 5 or x = -2"), AnswerVariableError);
  const ordinary = { ...spectrum, key: "roots", label: "All x-values" };
  assert(checkExact(ordinary, "x=5 or x=-2"));
  assert.throws(() => checkExact(ordinary, "λ=5 or λ=-2"), AnswerVariableError);
});

test("three-component input gives a neutral example and keeps component order", () => {
  const point = { key: "coordinates", type: "pairs", label: "Common point (x, y, z)", dimension: 3, expected: "(1,2,3)" };
  assert.equal(answerFormat(point).placeholder, "(1, 2, 3)");
  assert.match(answerFormat(point).en, /in the order shown/);
  assert(checkExact(point, "(1, 2, 3)"));
  assert(!checkExact(point, "(3, 2, 1)"));
});
