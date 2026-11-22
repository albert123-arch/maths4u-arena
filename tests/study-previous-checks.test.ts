import assert from "node:assert/strict";
import test from "node:test";
import { gradeStudyCheck, studyLayout } from "../src/lib/authored-study";

test("a replaced checkpoint keeps its original answer and remains available to Review", () => {
  const lessonId = "addmaths-0606-logs-log-laws";
  const checkId = lessonId + "-quotient-law-b";
  const layout = studyLayout(lessonId);
  assert.ok(layout);

  const { sections, extraPractice, previousChecks } = layout.study;
  assert.ok(!sections.some(section => section.blocks.some(block => block.kind === "check" && block.id === checkId)));
  assert.ok(!extraPractice?.some(check => check.id === checkId));
  const previous = previousChecks?.find(check => check.id === checkId);
  assert.ok(previous);
  assert.ok(previous.prompt.includes("katex"));
  assert.ok(previous.fields.every(field => !Object.hasOwn(field, "expected")));

  assert.equal(gradeStudyCheck(lessonId, checkId, "4")?.status, "correct");
  assert.equal(gradeStudyCheck(lessonId, checkId, "3")?.status, "retry");
  assert.equal(gradeStudyCheck(lessonId, checkId, "<<<")?.status, "format");
});
