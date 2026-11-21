import assert from "node:assert/strict";
import test from "node:test";
import { gradeStudyCheck, studyLayout } from "../src/lib/authored-study";
import { contentPackage, packageTopic } from "../src/lib/content-package-content";
import { packageTask } from "../src/lib/content-packages";
import { checkExact, checkThreeSignificantFigures, type ExactField } from "../src/lib/exact-answer";
import { permitsThreeSignificantFigures, s1FourDecimalPlaces, s1PracticeRounding, s1StudyRounding } from "../src/lib/s1-answer-precision";
import { nextSquareReview, squareSnapshot } from "../src/lib/square-model";
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
  for (const [chapter, topic] of [
    ["representation", "rep_cumulative"], ["central-tendency", "ct_centre_raw"],
    ["variation", "var_raw_moments"], ["probability", "prob_sample_spaces"],
    ["counting", "count_mixed_counting"], ["distributions", "dist_conditional_processes"],
    ["binomial-geometric", "bg_mixed_binomial"], ["normal", "norm_normal_models"],
  ]) {
    assert(s1StudyRounding(`orig_9709_s1_${topic}`), topic);
    assert(s1PracticeRounding(`9709-s1-${chapter}`, "short"), chapter);
    assert(s1PracticeRounding(`9709-s1-${chapter}`, "variant"), chapter);
    assert(!s1PracticeRounding(`9709-s1-${chapter}`, "exam"), chapter);
  }
  assert(!s1PracticeRounding("9709-p1-trigonometry", "short"));
  assert(!s1StudyRounding("orig_9709_p1_trig_sine_rule"));
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


test("S1 Your turn and extra practice in the four later chapters accept exact and 3 s.f. answers", () => {
  const cases = [
    ["count_mixed_counting", "S1-FINISH-50-C4", {}, "value1", "1/3", "0.333", "0.334"],
    ["count_selections", "S1-S048-20261121-P01", { committee: "330", chair: "1320", officers: "3960" }, "probability", "1/11", "0.0909", "0.091"],
    ["dist_conditional_processes", "S1-S054-20261121-C03", { a_success: "1/2", a_failure: "1/4" }, "success", "1/3", "0.333", "0.33"],
    ["bg_mixed_binomial", "S1-S058-20261121-C01", { intersection: "two_three" }, "probability", "10/11", "0.909", "0.910"],
    ["norm_normal_models", "S1-FINISH-63-C3", {}, "value1", "27/41", "0.659", "0.658"],
  ] as const;
  for (const [key, id, other, field, exact, rounded, wrong] of cases) {
    const lesson = "orig_9709_s1_" + key;
    assert.equal(gradeStudyCheck(lesson, id, { ...other, [field]: exact })?.status, "correct", id);
    assert.equal(gradeStudyCheck(lesson, id, { ...other, [field]: rounded })?.status, "correct", id);
    assert.equal(gradeStudyCheck(lesson, id, { ...other, [field]: wrong })?.status, "retry", id);
  }
});

test("S1 precision belongs to the answer field, including mixed exact, count and rounded questions", () => {
  const field: ExactField = { key: "p", label: "Probability", type: "number", expected: "1/11" };
  assert(permitsThreeSignificantFigures("data-precision", field, "<p>Measurements are recorded to two decimal places. Find the probability.</p>"));
  assert(!permitsThreeSignificantFigures("ratio", { ...field, type: "ratio", expected: ["1", "11"] }, ""));
  assert(!permitsThreeSignificantFigures("count", { ...field, expected: "1463" }, ""));
  assert(!permitsThreeSignificantFigures("choice", { ...field, type: "choice", expected: "A" }, ""));

  const dist = "orig_9709_s1_dist_inverse_applications", fee = "S1-S055-20261121-C05";
  assert.equal(gradeStudyCheck(dist, fee, { fee: "3/7", net: "-0.00143", fair: "no" })?.status, "correct");
  assert.match(gradeStudyCheck(dist, fee, { fee: "0.429", net: "-0.00143", fair: "no" })!.feedback, /Give the exact value/);

  const binomial = "orig_9709_s1_bg_mixed_binomial", exact = "S1-S058-20261121-P01";
  assert.equal(gradeStudyCheck(binomial, exact, { condition: "65/81", two: "24/65", upper: "9/65" })?.status, "correct");
  assert.equal(gradeStudyCheck(binomial, exact, { condition: "0.802", two: "24/65", upper: "9/65" })?.status, "retry");
});

test("S1 practice and review use the same field policy without changing assignment keys", () => {
  for (const [packKey, key, family, field, baseAnswers, freshAnswers, wrong] of [
    ["counting", "count_distinct_arrangements", "COUNT-CHECK-DISTINCT_ARRANGEMENTS-4", "probability",
      { positions: "6", arrangements: "144", probability: "0.2" }, { positions: "10", arrangements: "1200", probability: "0.238" }, "0.239"],
    ["distributions", "dist_finite_experiments", "DIST-CHECK-FINITE_EXPERIMENTS-2", "zero",
      { zero: "0.333", mean: "4/3", variance: "4/3", conditional: "2/3" }, { zero: "0.333", mean: "20/9", variance: "284/81", conditional: "2/3" }, "0.334"],
    ["binomial-geometric", "bg_binomial_models", "BG-CHECK-BINOMIAL_MODELS-1", "tail",
      { n: "4", p: "0.333", exact: "8/27", tail: "0.889" }, { n: "5", p: "1/2", exact: "5/16", tail: "0.813" }, "0.812"],
    ["normal", "norm_normal_areas", "NORM-CHECK-NORMAL_AREAS-1", "probability",
      { sd: "4", z: "1", probability: "0.1587" }, { sd: "3", z: "-1", probability: "0.8413" }, "0.842"],
  ] as const) {
    const lesson = "orig_9709_s1_" + key, baseId = "M4U-9709-S1-" + family + "-0";
    const base = squareQuestion(baseId, lesson);
    const { questions } = squarePublicLesson(packageTopic(lesson)!);
    const view = questions.find(q => q.uid === baseId)!;
    const now = 1000;
    const snapshot = squareSnapshot([{ eventKey: "prior", uid: view.uid, family: view.family, correct: false, helpUsed: false, at: now }]);
    const fresh = nextSquareReview(questions, snapshot, now)[0];
    assert.equal(fresh.uid, baseId.replace(/0$/, "1"));
    assert.equal(view.fields.find(f => f.key === field)?.[packKey === "normal" ? "decimalPlaces" : "significantFigures"], packKey === "normal" ? 4 : 3);
    assert(gradeSquare(base, baseAnswers).correct, baseId);
    const variant = squareQuestion(fresh.uid, lesson);
    assert(gradeSquare(variant, freshAnswers).correct, fresh.uid);
    assert(!gradeSquare(variant, { ...freshAnswers, [field]: wrong }).correct, fresh.uid);
    assert(s1PracticeRounding("9709-s1-" + packKey, "short"));
    assert(s1PracticeRounding("9709-s1-" + packKey, "variant"));
    assert(!s1PracticeRounding("9709-s1-" + packKey, "exam"));
  }
  const pack = contentPackage("9709-s1-distributions");
  const question = pack.questions.find(q => q.id === "M4U-9709-S1-DIST-CHECK-FINITE_EXPERIMENTS-2-0")!;
  const part = packageTask(pack, question).parts[0];
  const assigned = { ...part, acceptedAnswers: part.acceptedAnswers!.map(value => ({ value })) } as unknown as Parameters<typeof automaticPoints>[0];
  assert.equal(automaticPoints(assigned, { value: "1/3" }), part.maxPoints);
  assert.equal(automaticPoints(assigned, { value: "0.333" }), 0);
});

test("4 d.p. feedback distinguishes coarse rounding, trailing zeros and a wrong method", () => {
  const normal = "orig_9709_s1_norm_normal_areas", id = "S1-FINISH-61-C2";
  const precision = /Give your answer to 4 decimal places\./;
  assert.equal(gradeStudyCheck(normal, id, "0.3413")?.status, "correct");
  assert.equal(gradeStudyCheck(normal, id, "0.3413447")?.status, "correct");
  assert.match(gradeStudyCheck(normal, id, "0.341")!.feedback, precision);
  assert.doesNotMatch(gradeStudyCheck(normal, id, "0.342")!.feedback, precision);
  assert.match(gradeStudyCheck(normal, id, "0.8413")!.feedback, /Subtract the cumulative area/);

  const binomial = "orig_9709_s1_bg_binomial_models", binId = "S1-S056-20261121-P03";
  const answers = { zero: "0.0260", two: "0.2341", outside: "0" };
  assert.equal(gradeStudyCheck(binomial, binId, answers)?.status, "correct");
  assert.match(gradeStudyCheck(binomial, binId, { ...answers, zero: "0.026" })!.feedback, precision);
  assert.match(gradeStudyCheck(binomial, binId, { ...answers, zero: "0.2341" })!.feedback, /failure probability/);

  const binomialApprox = "orig_9709_s1_norm_binomial_approximation", approxId = "S1-S064-20261121-P04";
  const table = { lower_boundary: "185.5", interval: "0.6999", equal: "0.0397" };
  assert.equal(gradeStudyCheck(binomialApprox, approxId, table)?.status, "correct");
  assert.equal(gradeStudyCheck(binomialApprox, approxId, { ...table, interval: "0.6998" })?.status, "correct");
  assert.match(gradeStudyCheck(binomialApprox, approxId, { ...table, interval: "0.700" })!.feedback, precision);
  assert.doesNotMatch(gradeStudyCheck(binomialApprox, approxId, { ...table, interval: "0.7000" })!.feedback, precision);
  assert.equal(gradeStudyCheck(binomialApprox, approxId, { ...table, lower_boundary: "186" })?.status, "retry");
  assert.equal(gradeStudyCheck("orig_9709_s1_norm_normal_models", "S1-S063-20261121-C05",
    { conditional: "0.1886", exact1: "0.4087", expected: "0.94" })?.status, "correct");

  const pack = "orig_9709_s1_norm_normal_models";
  const short = squareQuestion("M4U-9709-S1-NORM-CHECK-NORMAL_MODELS-1-0", pack);
  const practice = { condition: "0.5000", numerator: "0.1587", conditional: "0.3173" };
  assert(gradeSquare(short, practice).correct);
  assert.match(gradeSquare(short, { ...practice, condition: "0.5" }).fields.condition.message, precision);
  assert.doesNotMatch(gradeSquare(short, { ...practice, condition: "0.6" }).fields.condition.message, precision);

  const source = contentPackage("9709-s1-normal");
  const assignedQuestion = source.questions.find(q => q.id === short.id)!;
  const part = packageTask(source, assignedQuestion).parts[0];
  const assigned = { ...part, acceptedAnswers: part.acceptedAnswers!.map(value => ({ value })) } as unknown as Parameters<typeof automaticPoints>[0];
  assert.equal(automaticPoints(assigned, { value: "0.5" }), part.maxPoints);
});

test("exact-count binomial events still allow ordinary 3 s.f. answers", () => {
  const base = squareQuestion("M4U-9709-S1-BG-CHECK-BINOMIAL_MODELS-1-0", "orig_9709_s1_bg_binomial_models");
  assert(gradeSquare(base, { n: "4", p: "0.333", exact: "0.296", tail: "0.889" }).correct);
  const fresh = squareQuestion("M4U-9709-S1-BG-CHECK-MIXED_BINOMIAL-3-1", "orig_9709_s1_bg_mixed_binomial");
  assert(gradeSquare(fresh, { q: "0.111", mean: "0.333", exact: "0.263" }).correct);
});

test("only the requested field gets four-place guidance in mixed-precision checks", () => {
  const lesson = "orig_9709_s1_norm_normal_models", id = "S1-S063-20261121-C03";
  const check = studyLayout(lesson)?.study.sections.flatMap(section => section.blocks)
    .find(block => block.kind === "check" && block.id === id);
  assert(check?.kind === "check");
  assert.equal(check.fields[0].decimalPlaces, 4);
  assert.equal(check.fields[1].decimalPlaces, undefined);
  for (const expected of ["9.10", "9.12"]) {
    assert.equal(gradeStudyCheck(lesson, id, { probability: "0.0228", expected })?.status, "correct");
  }
  const field = { key: "p", type: "approximate", label: "Probability", expected: "0.1234" };
  assert(s1FourDecimalPlaces("new-check", field, "Give the probability to 4 d.p."));
});
