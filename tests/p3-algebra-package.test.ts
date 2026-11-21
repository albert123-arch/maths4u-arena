import assert from "node:assert/strict";
import test from "node:test";
import { gradeStudyCheck, studyLayout, studyRevision } from "../src/lib/authored-study";
import { contentPackage, packageTopic, publicChapterPath } from "../src/lib/content-package-content";
import { checkExact } from "../src/lib/exact-answer";
import { gradeSquare, questionsForTopic, squarePublicLesson } from "../src/lib/square-content";
import { nextSquareReview, squareSnapshot } from "../src/lib/square-model";

test("Pure 3 Chapter 1 connects its teaching and complete-answer practice to the same lessons", () => {
  const pack = contentPackage("9709-p3-algebra");
  assert.equal(publicChapterPath(pack), "/courses/maths4u-9709-p3/chapters/algebra");
  assert.equal(pack.lessons.length, 5);

  for (const { id } of pack.lessons) {
    const topic = packageTopic(id);
    assert(topic);
    const page = squarePublicLesson(topic);
    const layout = studyLayout(id);
    const revision = studyRevision(id);
    assert(layout && revision);
    assert.equal(page.study?.sections.length, layout.study.sections.length);
    assert(page.study?.sections.every(section => section.blocks.some(block => block.kind === "check")));
    assert(!JSON.stringify([page, revision]).includes("katex-error"));
    assert(!JSON.stringify(page).includes('"expected"'));

    const questions = questionsForTopic(id);
    for (const question of questions.filter(item => item.collection !== "exam")) {
      const answers = Object.fromEntries(question.fields.map(field =>
        [field.key, Array.isArray(field.expected) ? field.expected.join(";") : field.expected]));
      assert(gradeSquare(question, answers).correct, question.id);
      delete answers[question.fields[0].key];
      assert(!gradeSquare(question, answers).correct, question.id);
    }
    const first = page.questions.find(question => question.collection === "short");
    assert(first);
    const now = 1000;
    const snapshot = squareSnapshot([
      { eventKey: "p3-review", uid: first.uid, family: first.family, correct: false, helpUsed: false, at: now },
    ]);
    const fresh = nextSquareReview(page.questions, snapshot, now)[0];
    assert.equal(fresh.family, first.family);
    assert.notEqual(fresh.uid, first.uid);
    assert.equal(fresh.collection, "variant");
  }
});

test("polynomial division accepts named complete expressions and distinguishes quotient from remainder", () => {
  const quotient = { key: "q", type: "polynomial", label: "Quotient Q(x)", variables: ["x"], expected: "2*x^2-3" };
  const remainder = { key: "remainder", type: "polynomial", label: "Remainder R(x)", variables: ["x"], expected: "x-4" };
  assert(checkExact(quotient, "Q(x) = -3 + 2x²"));
  assert(checkExact(remainder, "R(x) = x − 4"));
  assert(checkExact(remainder, "R = x − 4"));
  assert(checkExact({ ...remainder, expected: "1/2" }, "R = 1/2"));
  assert(!checkExact(remainder, "R(x) = x"));
  assert.throws(() => checkExact(quotient, "R(x) = -3 + 2x²"));
  assert.throws(() => checkExact(remainder, "Q(x) = x − 4"));
});

test("an empty solution set accepts ordinary words and still rejects them when roots exist", () => {
  const field = { key: "solutions", label: "All x-values", type: "set", expected: "empty", variables: ["x"] };
  assert(checkExact(field, "no solution"));
  assert(checkExact(field, "No real solutions"));
  assert(!checkExact({ ...field, expected: "{1}" }, "no solution"));
  assert.throws(() => checkExact({ ...field, type: "number" }, "no solution"));
});

test("Your turn returns a format result for an incomplete answer", () => {
  const id = "orig_9709_p3_alg_polynomial_division";
  const page = studyLayout(id)!;
  const check = page.study.sections.flatMap(section => section.blocks)
    .find(block => block.kind === "check" && block.fields.length > 1);
  assert(check?.kind === "check");
  assert.equal(gradeStudyCheck(id, check.id, { [check.fields[0].key]: "0" })?.status, "format");
});
