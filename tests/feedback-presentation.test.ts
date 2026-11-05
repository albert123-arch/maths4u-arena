import test from "node:test";
import assert from "node:assert/strict";
import { squareQuestions, gradeSquare, questionsForTopic } from "../src/lib/square-content";
import { completeAnswers } from "./quadratics-answers";
import { answerFormat, questionTitle } from "../src/lib/square-presentation";
import { quadraticTopics } from "../src/lib/square-model";
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

test("centre feedback distinguishes an opposite sign from an unrelated incorrect value", () => {
  const q = squareQuestions.find(q => q.id === "M4U-9709-Q26-S-CS01")!, correct = completeAnswers(q);
  for (const input of ["-7", "-14/2"]) {
    const r = gradeSquare(q, { ...correct, h: input });
    assert.equal(r.valid, true); assert.equal(r.correct, false);
    assert.match(r.fields.h.message, /opposite centre/);
  }
  const r = gradeSquare(q, { ...correct, h: "5", k: "2" });
  assert.equal(r.valid, true); assert.equal(r.correct, false);
  assert.match(r.fields.h.message, /Halve the coefficient/);
  assert.doesNotMatch(r.fields.h.message, /opposite|sign of/);
  assert.match(r.fields.k.message, /Subtract the square/);
  assert.doesNotMatch(r.fields.k.message, /without the outside multiplier/);
});

test("constant feedback identifies a missing multiplier only when its value matches", () => {
  const q = squareQuestions.find(q => q.id === "M4U-9709-Q26-S-CS03")!, correct = completeAnswers(q);
  // 3(x−2)²+5 = 3x²−12x+17. Subtracting 4 instead of 12 gives 13.
  const pattern = gradeSquare(q, { ...correct, k: "26/2" });
  assert.equal(pattern.valid, true); assert.equal(pattern.correct, false);
  assert.match(pattern.fields.k.message, /without the outside multiplier/);
  const other = gradeSquare(q, { ...correct, k: "2" });
  assert.match(other.fields.k.message, /Subtract the square/);
  assert.doesNotMatch(other.fields.k.message, /without the outside multiplier/);
  assert.equal(gradeSquare(q, correct).correct, true);
});

test("feedback pattern checks cannot turn a readable wrong answer into a format error", () => {
  const q = squareQuestions.find(q => q.id === "M4U-9709-Q26-S-CS01")!;
  const r = gradeSquare(q, { ...completeAnswers(q), h: "5" + "+0".repeat(59) });
  assert.equal(r.valid, true); assert.equal(r.correct, false);
  assert.equal(r.fields.h.formatError, undefined);
});

test("every existing question has a meaningful display title and type-specific format help", () => {
  for (const topic of quadraticTopics) for (const q of questionsForTopic(topic.key)) {
    assert.doesNotMatch(questionTitle({ uid: q.id, title: q.title }), /^(?:Question|Diagnostic) \d+$|M4U-/);
    for (const f of q.fields) {
      const help = answerFormat(f);
      assert.ok(help.en && help.ru);
      if (f.type === "pairs") assert.match(help.en, /pair|triple/);
      if (f.type === "equation") assert.match(help.en, /both sides of the equation/);
      if (f.type === "choice") assert.doesNotMatch(help.en, /interval|fraction/);
      if (f.type === "polynomial" && !f.variables?.length) assert.doesNotMatch(help.en, /interval|pair/);
    }
  }
});
