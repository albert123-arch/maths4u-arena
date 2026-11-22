import assert from "node:assert/strict";
import test from "node:test";
import { gradeStudyCheck, studyCheckRequest, studyLayout } from "../src/lib/authored-study";
import { contentPackage, packageTopic } from "../src/lib/content-package-content";
import { packageTask } from "../src/lib/content-packages";
import { nextSquareReview, squareSnapshot } from "../src/lib/square-model";
import { gradeSquare, squarePublicLesson, squareQuestion } from "../src/lib/square-content";
import { automaticPoints } from "../src/lib/works";

test("study-check request accepts all nine matrix entries in Your turn and Extra practice", () => {
  const lessonId = "fp1_matrices_inverses";
  for (const [suffix, topMiddle, topRight, middleRight] of [["check", "-3", "4", "-2"], ["extra", "-4", "10", "-3"]]) {
    const id = "inverses-three-columns-of-inverse-" + suffix;
    const answers = {
      entry_1_1: " 1 ", entry_1_2: topMiddle, entry_1_3: topRight,
      entry_2_1: "0", entry_2_2: "1", entry_2_3: middleRight,
      entry_3_1: "0", entry_3_2: "0", entry_3_3: "1",
    };
    const request = studyCheckRequest.parse({ lessonId, id, answers });
    assert.equal(request.answers?.entry_1_1, "1");
    assert.equal(gradeStudyCheck(lessonId, id, request.answers!)?.status, "correct");
    assert.equal(gradeStudyCheck(lessonId, id, { ...answers, entry_3_3: "2" })?.status, "retry");
    assert.equal(gradeStudyCheck(lessonId, id, { ...answers, entry_3_3: "" })?.status, "format");
  }
  const identity = { lessonId, id: "inverses-three-columns-of-inverse-check" };
  assert(!studyCheckRequest.safeParse({ ...identity, answers: {} }).success);
  assert(!studyCheckRequest.safeParse({ ...identity, answer: "1", answers: { entry_1_1: "1" } }).success);
  assert(!studyCheckRequest.safeParse({ ...identity, answers: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [i, "0"])) }).success);
});

test("0606 Your turn and Extra practice accept full generated check identifiers", () => {
  const course = "addmaths-0606-equations-inequalities-graphs-";
  const cases = [
    ["linear-modulus-equations", "constant-level-check-1", "{-4,12}"],
    ["quadratic-substitution", "roots-as-variables-extra-1", "{25}"],
  ];
  for (const [lesson, check, answer] of cases) {
    const lessonId = course + lesson;
    const id = lessonId + "-" + check;
    assert(id.length > 80);
    const request = studyCheckRequest.parse({ lessonId, id, answer });
    assert.equal(gradeStudyCheck(request.lessonId, request.id, request.answer!)?.status, "correct");
  }
  assert(!studyCheckRequest.safeParse({ lessonId: course + "quadratic-substitution", id: "a".repeat(129), answer: "1" }).success);
});

test("9709 Mechanics Your turn and Extra practice accept whole-number rounding and exact decimals", () => {
  const kinematics = "orig_9709_m1_kin_variable";
  assert.equal(gradeStudyCheck(kinematics, "variable-recover-position-second", { position: "977", displacement: "964" })?.status, "correct");
  assert.equal(gradeStudyCheck(kinematics, "variable-integrate-pieces-more", { displacement: "-24", distance: "125" })?.status, "correct");
  assert.equal(gradeStudyCheck(kinematics, "variable-recover-position-more", { position: "1620", displacement: "1600" })?.status, "correct");
  const forces = "orig_9709_m1_forces_smooth_equilibrium", tension = "m1-force-smooth_equilibrium-extra-5";
  assert.equal(gradeStudyCheck(forces, tension, { left: "111", right: "900/7" })?.status, "correct");
  assert.equal(gradeStudyCheck(forces, tension, { left: "780/7", right: "129" })?.status, "correct");
  assert.match(gradeStudyCheck(forces, tension, { left: "110", right: "129" })!.feedback, /tension|equilibrium/i);
  const energy = "orig_9709_m1_energy_kinetic_potential_energy", id = "m1-energy-kinetic_potential_energy-extra-5";
  assert.equal(gradeStudyCheck(energy, id, { ke: "87.5", pe: "140", total: "455/2" })?.status, "correct");
  assert.match(gradeStudyCheck(energy, id, { ke: "88", pe: "140", total: "455/2" })!.feedback, /3 significant figures/);
  assert.equal(studyLayout(energy)?.study.extraPractice?.find(q => q.id === id)?.fields[0].significantFigures, 3);
});

test("explicit exact requests remain strict, including within mixed Mechanics checks", () => {
  const lesson = "orig_9709_m1_energy_energy_principle", id = "m1-energy-energy_principle-4";
  assert.equal(gradeStudyCheck(lesson, id, { loss: "960/13", speed: "sqrt(27105)/13" })?.status, "correct");
  assert.match(gradeStudyCheck(lesson, id, { loss: "73.8", speed: "sqrt(27105)/13" })!.feedback, /Give the exact value/);

  const hooke = "fm_hooke_stages", spring = "stages-spring-launch-to-rough-patch-check";
  assert.equal(gradeStudyCheck(hooke, spring, { speed: "sqrt(15)", distance: "1.88" })?.status, "correct");
  assert.match(gradeStudyCheck(hooke, spring, { speed: "3.87", distance: "1.88" })!.feedback, /Give the exact value/);
  assert.match(gradeStudyCheck(hooke, spring, { speed: "4", distance: "1.88" })!.feedback, /Give the exact value/);
});

test("a recognised later event retains its mechanics feedback", () => {
  const lesson = "fm_projectiles_stages", check = "stages-compare-the-first-events-check";
  const result = gradeStudyCheck(lesson, check, { event: "ground", time: "3" });
  assert.equal(result?.status, "retry");
  assert.match(result!.feedback, /later candidate/);
});

test("Mechanics short practice and fresh review share the precision policy without changing assigned marks", () => {
  const lesson = "orig_9709_m1_energy_energy_in_stages";
  const id = "M4U-9709-M1-ENERGY-ENERGY-IN-STAGES-02-0";
  const { questions } = squarePublicLesson(packageTopic(lesson)!);
  const short = questions.find(q => q.uid === id)!;
  assert.equal(short.fields[0].significantFigures, 3);
  assert(gradeSquare(squareQuestion(id, lesson), { distance: "19.2" }).correct);
  assert.match(gradeSquare(squareQuestion(id, lesson), { distance: "19" }).fields.distance.message, /3 significant figures/);
  const now = 1000, snapshot = squareSnapshot([{ eventKey: "prior", uid: id, family: short.family, correct: false, helpUsed: false, at: now }]);
  const variant = nextSquareReview(questions, snapshot, now)[0];
  assert.equal(variant.uid, id.replace(/0$/, "1"));
  assert(gradeSquare(squareQuestion(variant.uid, lesson), { distance: "17.6" }).correct);

  const further = squareQuestion("M4U-9231-MHOOK-M21", "fm_hooke_models");
  assert(gradeSquare(further, { tension: "17", extension: "3/10", depth: "1.32" }).correct);
  assert(!gradeSquare(further, { tension: "17", extension: "3/10", depth: "1.31" }).correct);

  const pack = contentPackage("9709-m1-energy-work-power");
  const native = packageTask(pack, pack.questions.find(q => q.id === id)!).parts[0];
  const assigned = { ...native, acceptedAnswers: native.acceptedAnswers!.map(value => ({ value })) } as unknown as Parameters<typeof automaticPoints>[0];
  assert.equal(automaticPoints(assigned, { value: "173/9" }), native.maxPoints);
  assert.equal(automaticPoints(assigned, { value: "19.2" }), 0);
});

test("Further Statistics explains precision while preserving the authored 4 d.p. tolerance", () => {
  const lesson = "stats_crv_moments", id = "stats-crv-moments-study-06";
  const { study } = studyLayout(lesson)!;
  const blocks = study.sections.flatMap(section => section.blocks).filter(block => block.kind === "check");
  const check = [...blocks, ...(study.extraPractice ?? [])].find(block => block.id === id);
  assert(check);
  assert.equal(check.fields[0].decimalPlaces, 4);
  assert.match(check.prompt, /Keep intermediate values unrounded/);
  assert.equal(gradeStudyCheck(lesson, id, { mean: "0.3333", variance: "0.0044" })?.status, "correct");
  assert.equal(gradeStudyCheck(lesson, id, { mean: "0.3333333", variance: "0.0044134" })?.status, "correct");
  assert.match(gradeStudyCheck(lesson, id, { mean: "0.333", variance: "0.0044" })!.feedback, /Keep intermediate values unrounded/);
  assert.equal(gradeStudyCheck(lesson, id, { mean: "0.3333", variance: "0.0045" })?.status, "retry");
});
