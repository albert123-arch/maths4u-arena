import assert from "node:assert/strict";
import test from "node:test";
import { gradeStudyCheck, studyLayout } from "../src/lib/authored-study";
import { contentPackage, packageTopic } from "../src/lib/content-package-content";
import { packageTask } from "../src/lib/content-packages";
import { checkExact, checkThreeSignificantFigures, type ExactField } from "../src/lib/exact-answer";
import { permitsThreeSignificantFigures, s1PracticeRounding, s1StudyRounding } from "../src/lib/s1-answer-precision";
import { gradeSquare, squarePublicLesson, squareQuestion } from "../src/lib/square-content";
import { automaticPoints } from "../src/lib/works";

test("S1 study accepts accurate rounding and exact equivalents for unqualified scalars", () => {
  const lesson = "orig_9709_s1_rep_cumulative", id = "S1-S029-20261121-P05";
  const exact = { ma: "130/9", mb: "180/7", pa: "3/4", pb: "3/10", lower: "a" };
  assert.equal(gradeStudyCheck(lesson, id, exact)?.status, "correct");
  assert.equal(gradeStudyCheck(lesson, id, { ...exact, ma: "14.4", mb: "25.7" })?.status, "correct");
  assert.equal(gradeStudyCheck(lesson, id, { ...exact, ma: "14.44" })?.status, "correct");
  assert.equal(gradeStudyCheck(lesson, id, { ...exact, ma: "14" })?.status, "retry");
  assert.equal(gradeStudyCheck(lesson, id, { ...exact, ma: "14.46" })?.status, "retry");
  assert.equal(gradeStudyCheck(lesson, id, { ...exact, ma: "not a number" })?.status, "format");
  assert.equal(studyLayout(lesson)?.study.extraPractice?.find(q => q.id === id)?.fields[0].significantFigures, 3);
  assert.equal(gradeStudyCheck("orig_9709_s1_rep_boxplots", "S1-S030-20261121-P05",
    { ma: "8", mb: "8.11", same: "yes" })?.status, "correct");
  assert.equal(gradeStudyCheck("orig_9709_s1_prob_changing_samples", "S1-S045-20261121-C03",
    { drawred: "0.267", transferredred: "1/2", sameobject: "1/5", samegiven: "1/4" })?.status, "correct");
});

test("requests for exact results and other precision remain strict", () => {
  for (const [lesson, id, answer] of [
    ["orig_9709_s1_rep_histograms", "S1-S028-20261121-P04", { mean: "7.3", var: "18.21", sd: "4.27" }],
    ["orig_9709_s1_ct_centre_raw", "S1-S031-20261121-C05", { mean: "4", variance: "5", sd: "2.24" }],
    ["orig_9709_s1_var_changes_combining", "S1-S039-20261121-P01", { mean: "5", variance: "6.8", sd: "2.61" }],
  ] as const) {
    const result = gradeStudyCheck(lesson, id, answer);
    assert.equal(result?.status, "retry");
    assert.match(result?.feedback ?? "", /Give the exact value/);
  }
  const field = { key: "p", label: "Probability", type: "number", expected: "11/15" };
  for (const prompt of [
    "<p>Give the exact probability.</p>", "<p>Give answers as reduced fractions.</p>",
    "<p>Give the answer to four decimal places.</p>", "<p>State the probability exactly.</p>",
    "<p>Calculate the result without rounding.</p>",
  ]) assert(!permitsThreeSignificantFigures("new-check", field, prompt), prompt);
});

test("S1 short questions and fresh variants permit rounding only in the lesson projection", () => {
  const pack = contentPackage("9709-s1-probability");
  const lesson = "orig_9709_s1_prob_sample_spaces";
  const id = "M4U-9709-S1-PROB-CHECK-SAMPLE_SPACES-3-0";
  const base = squareQuestion(id, lesson);
  const fresh = squareQuestion(id.replace(/0$/, "1"), lesson);
  assert(gradeSquare(base, { joint: "0", union: "0.733", choice: "B" }).correct);
  assert(gradeSquare(fresh, { joint: "1.33e-1", union: "0.6", choice: "A" }).correct);
  assert(!gradeSquare(base, { joint: "0", union: "0.73", choice: "B" }).correct);
  assert(!gradeSquare(base, { joint: "0", union: "0.734", choice: "B" }).correct);
  assert(!gradeSquare(base, { joint: "0", union: "0.733" }).correct);
  const field = squarePublicLesson(packageTopic(lesson)!).questions.find(q => q.uid === id)?.fields.find(f => f.key === "union");
  assert.equal(field?.significantFigures, 3);
  assert(!JSON.stringify(field).includes("11/15"));

  const nativeQuestion = pack.questions.find(q => q.id === id)!;
  const native = packageTask(pack, nativeQuestion).parts[1];
  const assigned = {
    ...native, acceptedAnswers: native.acceptedAnswers!.map(value => ({ value })),
  } as unknown as Parameters<typeof automaticPoints>[0];
  assert.equal(automaticPoints(assigned, { value: "11/15" }), native.maxPoints);
  assert.equal(automaticPoints(assigned, { value: "0.733" }), 0);
  assert(!("statisticsRounding" in nativeQuestion));
  const requested = squareQuestion("M4U-9709-S1-VAR-CHECK-FREQUENCY_SYNTHESIS-2-0", "orig_9709_s1_var_frequency_synthesis");
  assert(!gradeSquare(requested, { mean: "8.11", variance: "1790/81", sd: "sqrt(1790)/9" }).correct);
  assert(!s1PracticeRounding("9709-s1-probability", "exam"));
  assert(!s1PracticeRounding("9709-s1-normal", "short"));
  assert(!s1StudyRounding("orig_9709_s1_norm_central_intervals"));
});

test("3 s.f. handles decimal halfway values, signs and leading zeros without a fixed tolerance", () => {
  const field: ExactField = { key: "value", label: "Value", type: "number", expected: "67/4" };
  assert(checkThreeSignificantFigures(field, "16.8"));
  assert(!checkThreeSignificantFigures(field, "16.7"));
  assert(!checkExact(field, "16.8"));
  assert(checkThreeSignificantFigures({ ...field, expected: "-67/4" }, "-16.8"));
  assert(checkThreeSignificantFigures({ ...field, expected: "1/3000" }, "0.000333"));
  assert(!checkThreeSignificantFigures({ ...field, expected: "1/3000" }, "0.00033"));
  assert(!checkThreeSignificantFigures({ ...field, expected: "1463" }, "1460"));
});
