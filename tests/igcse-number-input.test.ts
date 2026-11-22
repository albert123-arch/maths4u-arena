import assert from "node:assert/strict";
import test from "node:test";
import { gradeStudyCheck, studyLayout } from "../src/lib/authored-study";
import { gradeSquare, questionsForTopic, squareQuestion } from "../src/lib/square-content";

test("0580 mixed numbers work in both the lesson check and short practice", () => {
  const lesson = "igcse-0580-operations-fraction-add-subtract";
  const turn = lesson + "-mixed-one";
  assert.equal(gradeStudyCheck(lesson, turn, "1 5/6")?.status, "correct");
  assert.equal(gradeStudyCheck(lesson, turn, "1 4/6")?.status, "retry");
  const q = squareQuestion(lesson + "-P3-0", lesson);
  assert(gradeSquare(q, { answer: "3 23/36" }).correct);
  assert(gradeSquare(q, { answer: "131/36" }).correct);
  assert(!gradeSquare(q, { answer: "3 22/36" }).correct);
  assert(!gradeSquare(q, { answer: "3 23/0" }).correct);
});

test("the pounds field accepts a number with its printed currency symbol", () => {
  const lesson = "igcse-0580-operations-decimal-add-subtract";
  const q = squareQuestion(lesson + "-P3-0", lesson);
  assert(gradeSquare(q, { answer: "£15.52" }).correct);
  assert(gradeSquare(q, { answer: "15.52" }).correct);
  assert(!gradeSquare(q, { answer: "£15.50" }).correct);
  assert(!gradeSquare(q, { answer: "$15.52" }).correct);
});


test("0580 accepts the usual 24-hour clock notation in notes and practice", () => {
  const id = "igcse-0580-time-clocks";
  const exercise = id + "-to24-two";
  assert.equal(gradeStudyCheck(id, exercise, "02:17")?.status, "correct");
  assert.equal(gradeStudyCheck(id, exercise, "0217")?.status, "correct");
  assert.equal(gradeStudyCheck(id, exercise, "02 17")?.status, "correct");
  assert.equal(gradeStudyCheck(id, exercise, "12:17")?.status, "retry");
  const q = squareQuestion(id + "-P1-0", id);
  assert(gradeSquare(q, { answer: "05:32" }).correct);
  assert(!gradeSquare(q, { answer: "15:32" }).correct);
  assert(!gradeSquare(q, { answer: "05:92" }).correct);
});

test("0580 percentage answers accept a percent sign without scaling the value", () => {
  const id = "igcse-0580-percentages-change-and-points";
  const q = questionsForTopic(id).find(question => question.collection === "short" &&
    question.fields.length === 1 && question.fields[0].label === "Percentage (number before %)");
  assert(q);
  const f = q.fields[0];
  assert.equal(typeof f.expected, "string");
  assert(gradeSquare(q, { [f.key]: f.expected + "%" }).correct);
  assert(!gradeSquare(q, { [f.key]: String(Number(f.expected) / 100) + "%" }).correct);
});


test("0580 rearranged formulas accept the requested subject followed by an equals sign", () => {
  const id = "igcse-0580-equations-formulae";
  const q = squareQuestion(id + "-P1-0", id);
  const [numerator, denominator] = q.fields[0].expected as [string, string];
  const fraction = "(" + numerator + ")/(" + denominator + ")";
  assert(gradeSquare(q, { answer: fraction }).correct);
  assert(gradeSquare(q, { answer: "x = " + fraction }).correct);
  assert(!gradeSquare(q, { answer: "y = " + fraction }).correct);
  assert(!gradeSquare(q, { answer: "x^2 = " + fraction }).correct);
});

test("algebraic fraction misconceptions show their specific feedback", () => {
  const lesson = "igcse-0580-af-numerical-denominators";
  const item = lesson + "-same-denominator-a";
  assert.equal(gradeStudyCheck(lesson, item, "(8x-9)/8")?.status, "correct");
  const wrong = gradeStudyCheck(lesson, item, "(8x-9)/16");
  assert.equal(wrong?.status, "retry");
  assert.match(wrong?.feedback ?? "", /Adding the denominators does not give equivalent fractions/);
});


test("a lesson can introduce a section directly with its key idea block", () => {
  const lesson = studyLayout("igcse-0580-af-factorise-and-restrict");
  assert(lesson);
  assert.equal(lesson.study.sections[0].intro, "");
  assert.equal(lesson.study.sections[0].blocks[0].kind, "key");
});
