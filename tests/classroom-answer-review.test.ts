import assert from "node:assert/strict";
import test from "node:test";
import { gradeStudyCheck, studyLayout } from "../src/lib/authored-study";
import { checkExact } from "../src/lib/exact-answer";
import { igcseNumberInput } from "../src/lib/igcse-number-input";
import { studyPrecisionPolicy, lessonAnswerPrecision } from "../src/lib/lesson-answer-precision";
import { gradeSquare, type SourceQuestion } from "../src/lib/square-content";

test("school checks accept the appropriate precision for angles, averages and amounts", () => {
  const cases = [
    ["lower-0862-s7-bars-pies", "s2-try-2", "98°", "99°"],
    ["lower-0862-s7-bars-pies", "s2-try-2", "98.2", "98.3"],
    ["lower-0862-s7-averages-range", "s4-try-1", "8.21", "8.22"],
    ["lower-0862-s9-compound-percentages", "s1-try-1", "595.13", "595.12"],
    ["lower-0862-s9-pythagoras", "audit-root-length", "3.61", "3.6"],
  ];
  for (const [lesson, check, correct, close] of cases) {
    assert.equal(gradeStudyCheck(lesson, check, correct)?.status, "correct", `${lesson}/${check}: ${correct}`);
    assert.equal(gradeStudyCheck(lesson, check, close)?.status, "retry", `${lesson}/${check}: ${close}`);
  }
});

test("degrees, money and percentages are parsed only in their own answer contexts", () => {
  for (const [label, expected, typed] of [
    ["Three-figure bearing", "65", "065°"], ["Amount in dollars", "11.02", "$11.02"],
    ["Probability", "1/5", "20%"], ["Percentage increase", "20", "20%"],
  ]) {
    const field = { key: "answer", label, type: "number", expected };
    assert(checkExact(field, igcseNumberInput(field, typed)));
  }
  const unrelated = { key: "answer", label: "Number of items", type: "number", expected: "20" };
  assert.equal(igcseNumberInput(unrelated, "20%"), "20%");
  assert.equal(igcseNumberInput(unrelated, "20°"), "20°");
  const usd = { ...unrelated, label: "Amount in dollars" };
  assert.equal(igcseNumberInput(usd, "£20"), "£20");
});

test("school precision keeps explicit fraction and pi requests exact", () => {
  const field = { key: "answer", label: "Area", type: "number", expected: "44pi" };
  const course = studyPrecisionPolicy("igcse-0580-mensuration");
  const policy = lessonAnswerPrecision(course, "area", field, String.raw`<p>Give your answer in terms of \(\pi\).</p>`);
  assert.equal(policy.significantFigures, undefined);
  assert.equal(gradeStudyCheck("igcse-0580-prob-trees-with-replacement", "igcse-0580-prob-trees-with-replacement-reset-a", "169/289")?.status, "correct");
  assert.equal(gradeStudyCheck("igcse-0580-prob-trees-with-replacement", "igcse-0580-prob-trees-with-replacement-reset-a", "0.585")?.status, "retry");
});

test("Additional Mathematics recognises exam notation without changing the full solution", () => {
  const cases = [
    ["addmaths-0606-trig-reciprocal-functions", "addmaths-0606-trig-reciprocal-functions-reciprocals-b", "240°, 720°", "240°"],
    ["addmaths-0606-vectors-components", "addmaths-0606-vectors-components-direction-a", "12i−4j", "12j−4i"],
    ["addmaths-0606-vectors-components", "addmaths-0606-vectors-components-direction-a", "−4j + 12i", "12i−4i"],
    ["addmaths-0606-equations-inequalities-graphs-linear-modulus-inequalities", "addmaths-0606-equations-inequalities-graphs-linear-modulus-inequalities-both-sides-check-1", "x≤92/13, x≥20", "x<92/13, x≥20"],
    ["addmaths-0606-d1-chain-rule", "addmaths-0606-d1-chain-rule-reciprocal-2", "-0.00115", "-0.0011"],
  ];
  for (const [lesson, id, correct, wrong] of cases) {
    assert.equal(gradeStudyCheck(lesson, id, correct)?.status, "correct", correct);
    assert.notEqual(gradeStudyCheck(lesson, id, wrong)?.status, "correct", wrong);
  }
});

test("Additional Mathematics practice respects degree, radian and exact-value instructions", () => {
  const grade = (label: string, expected: string, prompt_html: string, answer: string, type = "number") => {
    const question: SourceQuestion = {
      id: "fixture", family_uid: "fixture", title: "Fixture", collection: "short", prompt_html,
      hint_html: "", solution_html: "", answer_html: "", marks: 1, difficulty: 1,
      fields: [{ key: "answer", label, type, expected }], precisionPolicy: "additional-maths",
    };
    return gradeSquare(question, { answer }).correct;
  };
  assert(grade("Arc length", "7pi", "<p>Find the arc length.</p>", "22.0"));
  assert(!grade("Arc length", "7pi", String.raw`<p>Give the arc length in terms of \(\pi\).</p>`, "22.0"));
  assert(grade("Angle in radians", "pi/2", "<p>Find the angle in radians.</p>", "1.57"));
  assert(!grade("Angle in radians", "pi/2", "<p>Find the angle in radians.</p>", "1.57°"));
  assert(grade("Angle in degrees", "9/7", "<p>Find the angle in degrees.</p>", "1.3°"));
  assert(grade("Exact area", "24sqrt(3)", "<p>Give the exact area.</p>", "24sqrt3"));
  assert(!grade("Exact area", "24sqrt(3)", "<p>Give the exact area.</p>", "41.6"));
  assert(grade("Solution set", "[2,8]", "<p>Find the solution set.</p>", "x≥2, x≤8", "set"));
  assert(!grade("Solution set", "pi/2", "<p>Give all values in radians.</p>", "90°", "set"));
});

test("Multiple choice moves between positions while retaining the original option values", () => {
  const id = "addmaths-0606-int-reverse";
  const layout = studyLayout(id);
  assert(layout);
  const options = [
    ...layout.study.sections.flatMap(section => section.blocks.filter(block => block.kind === "check")),
    ...(layout.study.extraPractice ?? []),
  ].filter(check => check.fields[0].options);
  assert(options.length >= 4);
  const correctIndices = options.map(check => {
    const values = Object.keys(check.fields[0].options!);
    return values.findIndex(value => gradeStudyCheck(id, check.id, value)?.status === "correct");
  });
  assert(correctIndices.every(index => index >= 0));
  assert(new Set(correctIndices).size > 2);
});
