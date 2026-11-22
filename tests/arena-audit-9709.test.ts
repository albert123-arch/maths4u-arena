import assert from "node:assert/strict";
import test from "node:test";
import { gradeStudyCheck, studyLayout } from "../src/lib/authored-study";
import { packageTopic } from "../src/lib/content-package-content";
import { gradeSquare, squarePublicLesson, squareQuestion } from "../src/lib/square-content";
import { studyCheckpointRequest } from "../src/lib/study-checkpoints";

test("horizontal and inclined smooth contact have a unique correct response", () => {
  const lessonId = "orig_9709_m1_forces_force_models";
  const study = studyLayout(lessonId)!.study;
  const checkIds = ["m1-force-force_models-3", "m1-force-force_models-extra-3"];
  const checks = [...study.sections.flatMap(s => s.blocks.filter(b => b.kind === "check")), ...(study.extraPractice ?? [])];
  assert.match(checks.find(check => check.id === checkIds[0])!.fields[0].options!.normal, /vertically upwards, perpendicular/);
  for (const id of checkIds) {
    for (const answer of ["normal", "absent", "vertical"]) {
      assert.equal(gradeStudyCheck(lessonId, id, answer)?.status, answer === "normal" ? "correct" : "retry");
    }
  }
  const uid = "M4U-9709-M1-FORCES-FORCE-MODELS-02-0";
  const question = squareQuestion(uid, lessonId);
  const visible = squarePublicLesson(packageTopic(lessonId)).questions.find(item => item.uid === uid)!;
  assert.match(visible.fields[0].options!.vertical, /horizontally along the table/);
  assert.equal(question.fields[0].options!.vertical, "It always acts vertically upwards.");
  assert(gradeSquare(question, { decision: "normal" }).correct);
  assert(!gradeSquare(question, { decision: "vertical" }).correct);
});

test("all five Normal lessons retain every section and use existing independent exit checks", () => {
  for (const slug of ["normal_areas", "inverse_normal", "normal_models", "binomial_approximation", "mixed_inverse"]) {
    const study = studyLayout("orig_9709_s1_norm_" + slug)!.study;
    const sessions = study.sessions!;
    const byId = new Map(study.sections.map(section => [section.id, section]));
    assert(sessions.length >= 3);
    assert.deepEqual(sessions.flatMap(session => session.sections), study.sections.map(section => section.id));
    assert(sessions[0].sections.reduce((min, id) => min + byId.get(id)!.minutes, 0) <= 25);
    assert(study.sections.every(section => section.level === "core"));
    for (const session of sessions) {
      const exitIds = session.sections.flatMap(id => byId.get(id)!.blocks.filter(block => block.kind === "check").map(block => block.id));
      assert(exitIds.length > 0);
      assert.deepEqual(session.exitChecks, exitIds);
    }
  }
});

test("theory evidence is optional and restricted to an attempt key and hint state", () => {
  const base = { lessonId: "orig_9709_m1_forces_force_models", id: "m1-force-force_models-3", answer: "normal" };
  const event = { key: "ad3101b4-6802-400f-bef3-fe99b315932a", helpUsed: false };
  assert(studyCheckpointRequest.safeParse(base).success);
  assert(studyCheckpointRequest.safeParse({ ...base, event }).success);
  assert(!studyCheckpointRequest.safeParse({ ...base, event: { ...event, correct: true } }).success);
  assert(!studyCheckpointRequest.safeParse({ ...base, event: { ...event, key: "retry" } }).success);
  assert(!studyCheckpointRequest.safeParse({ ...base, event, answers: { decision: "normal" } }).success);
});
