import assert from "node:assert/strict";
import test from "node:test";
import { gradeStudyCheck, studyLayout } from "../src/lib/authored-study";
import { mixedNumberParts } from "../src/lib/mixed-number";
import { gradeSquare, squarePublicLesson, squareQuestion } from "../src/lib/square-content";
import { learningTopic } from "../src/lib/square-content";
import { answerFormat } from "../src/lib/square-presentation";

const seven = "lower-0862-s7-calculating-fractions";
const eight = "lower-0862-s8-fraction-calculations";

test("the Year 7 rope checkpoint requires an exact, simplified mixed number in the component", () => {
  const layout = studyLayout(seven)!;
  const check = layout.study.sections.flatMap(s => s.blocks).find(b => b.kind === "check" && b.id === "s1-try-1");
  assert(check?.kind === "check");
  const field = check.fields[0];
  assert.equal(field.mixedNumber, "simplest");
  assert.equal(field.significantFigures, undefined);
  assert.doesNotMatch(answerFormat(field).en, /round|calculator/i);
  assert.match(check.prompt, /<mfrac>/);
  assert.equal(gradeStudyCheck(seven, check.id, "13 5/7")?.status, "correct");
  assert.equal(gradeStudyCheck(seven, check.id, "96/7")?.status, "correct"); // Old exact payload
  assert.match(gradeStudyCheck(seven, check.id, "13 10/14")?.feedback ?? "", /Simplify the fractional part/);
  assert.match(gradeStudyCheck(seven, check.id, "12 12/7")?.feedback ?? "", /Regroup the fraction/);
  assert.match(gradeStudyCheck(seven, check.id, "13 5/0")?.feedback ?? "", /denominator must be greater than zero/);
  assert.equal(gradeStudyCheck(seven, check.id, "13.7")?.status, "retry");
  assert.equal(gradeStudyCheck(eight, "s3-try-1", "2 6/7")?.status, "correct");
});

test("short practice and fresh variants receive the same control only when the answer is a mixed number", () => {
  for (const lessonId of [seven, eight]) {
    const lesson = squarePublicLesson(learningTopic(lessonId));
    const mixed = lesson.questions.filter(q => q.fields.some(f => f.mixedNumber));
    assert.equal(mixed.length, 6);
    for (const q of mixed) {
      assert.equal(q.fields[0].significantFigures, undefined);
      assert.doesNotMatch(answerFormat(q.fields[0]).en, /round|calculator/i);
      const source = squareQuestion(q.uid, lessonId);
      const { whole, numerator, denominator } = mixedNumberParts(String(source.fields[0].expected));
      assert(gradeSquare(source, { answer: whole + " " + numerator + "/" + denominator }).correct, q.uid);
      assert(!gradeSquare(source, { answer: whole + " " + Number(numerator) * 2 + "/" + Number(denominator) * 2 }).correct, q.uid);
    }
    assert(lesson.questions.some(q => q.fields.length && !q.fields.some(f => f.mixedNumber)));
  }
  const rope = squareQuestion(seven + "-P01-0", seven);
  assert(!gradeSquare(rope, { answer: "16.5" }).correct);
});

test("older single-field drafts and partially filled mixed number drafts keep their values", () => {
  assert.deepEqual(mixedNumberParts("96/7"), { whole: "13", numerator: "5", denominator: "7" });
  assert.deepEqual(mixedNumberParts("13.75"), { whole: "13", numerator: "3", denominator: "4" });
  assert.deepEqual(mixedNumberParts("13 /7"), { whole: "13", numerator: "", denominator: "7" });
  assert.deepEqual(mixedNumberParts(" 5/"), { whole: "", numerator: "5", denominator: "" });
});
