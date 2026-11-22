import { test } from "node:test";
import assert from "node:assert/strict";
import {
  archivedMaths4uAsset, makeInternalContent, normalizeArchivedHtml,
} from "../scripts/exam-archive-internal-plan.mjs";

test("internal archive importer keeps only old Maths4U image references", () => {
  assert.equal(archivedMaths4uAsset("https://maths4u.sbs/uploads/exams/diagrams/a.svg"),
    "https://maths4u.sbs/uploads/exams/diagrams/a.svg");
  for (const candidate of [
    "https://arena.maths4u.sbs/uploads/exams/diagram.svg",
    "https://maths4u.sbs.example.com/uploads/exams/diagram.svg",
    "https://user@maths4u.sbs/uploads/exams/diagram.svg",
    "https://maths4u.sbs/uploads/exams/x%2f..%2f..%2foutside.svg",
    "https://maths4u.sbs/uploads/exams/diagram.svg?token=1",
    "https://maths4u.sbs/uploads/another/diagram.svg",
    "https://maths4u.sbs/uploads/exams/diagram.php",
    "http://maths4u.sbs/uploads/exams/diagram.svg",
    "images/offline.png",
  ]) assert.equal(archivedMaths4uAsset(candidate), null, candidate);
});

test("legacy formula recovery preserves the body and drops offline image paths", () => {
  assert.equal(normalizeArchivedHtml("<p>\\(\f rac{a}{b}\\) \boldsymbol{x}</p><img src='images/offline.png'>"),
    "<p>\\( rac{a}{b}\\) \\boldsymbol{x}</p>");
  assert.equal(normalizeArchivedHtml("<p>\\(\frac{a}{b}\\)</p>"), "<p>\\(\\frac{a}{b}\\)</p>");
});

test("each source extract and printed split part remains readable without copying diagram bytes or MS text", () => {
  const exam = { syllabus: "9709", year: 2025, examSession: "June", paper: "12", questionNumber: "1" };
  const base = {
    exam, id: 1, marks: 2, question_html: "<p>First source extract.</p>", solution_html: "<p>First worked solution.</p>",
    assets: [
      { role: "question" as const, source_url: "https://maths4u.sbs/uploads/exams/diagram.svg", available: true },
      { role: "solution" as const, source_url: "https://maths4u.sbs/uploads/exams/answer.svg", available: true },
      { role: "mark_scheme" as const, source_url: "https://maths4u.sbs/uploads/problems/ms.jpg", available: true },
      { role: "question" as const, source_url: "https://maths4u.sbs/uploads/exams/missing.svg", available: false },
    ],
    parts: [],
  };
  const result = makeInternalContent("exam_question_synthetic", [
    { source: base, part: null },
    { source: { ...base, id: 2, marks: 3, question_html: "<p>Another source extract.</p>" }, part: null },
    { source: { ...base, id: 3, marks: 1, question_html: "<p>Printed split part.</p>" }, part: "i" },
  ], new Map());
  assert.match(result.statementHtml, /Source extract 1 · 2 marks/);
  assert.match(result.statementHtml, /Source extract 2 · 3 marks/);
  assert.match(result.statementHtml, /Part \(i\) · 1 mark/);
  assert.match(result.statementHtml, /Printed split part/);
  assert.match(result.solutionHtml ?? "", /First worked solution/);
  assert.equal(result.images.length, 1);
  assert.equal(result.solutionImages.length, 1);
  assert.equal(result.markSchemes.length, 1);
  assert.match(result.markSchemes[0].href, /\/uploads\/problems\/ms\.jpg$/);
});
