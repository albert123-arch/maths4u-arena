import test from "node:test";
import assert from "node:assert/strict";
import { squareQuestions, gradeSquare } from "../src/lib/square-content";
import { completeAnswers } from "./quadratics-answers";
test("only an unreadable field is marked as a format error in a mixed answer", () => {
  const question = squareQuestions.find(q => q.collection === "short" && q.fields.length >= 3)!;
  const answers = completeAnswers(question), [unreadable, wrong, correct] = question.fields;
  const result = gradeSquare(question, { ...answers, [unreadable.key]: "not-math", [wrong.key]: "999" });
  assert.equal(result.valid, false);
  assert.equal(result.fields[unreadable.key].formatError, true);
  assert.equal(result.fields[wrong.key].correct, false);
  assert.equal(result.fields[wrong.key].formatError, undefined);
  assert.equal(result.fields[correct.key].correct, true);
  assert.equal(result.fields[correct.key].formatError, undefined);
});
