import test from "node:test";
import assert from "node:assert/strict";
import { displayDescription, displayMarkup, displaySource, displayTeacherNote, displayTitle, hasRussianPage, russianAvailability, programOrder } from "../src/lib/public-presentation";
import { publicVersion, type Version } from "../src/lib/content";

test("display-only cleanup preserves objectives, questions, mathematics and marks", () => {
  assert.equal(displayTitle("Quadratics · Maths4U Original"), "Quadratics");
  assert.equal(displayTitle("Maths4U Original · Quadratics"), "Quadratics");
  assert.equal(displayTitle("Additional Mathematics"), "Additional Mathematics");
  assert.equal(displayDescription("Maths4U Original pilot: internal preparation notes"), "");
  assert.equal(displayDescription(""), "");
  const body = '<p><strong>Maths4U Original</strong> · Complete a square.</p><h2>Method</h2>';
  assert.equal(displayMarkup(body), '<p>Complete a square.</p><h2>Method</h2>');
  const stem = '<p><strong>Maths4U Original · M4U-ORIG-QUAD-01 · 8 marks</strong></p><p>Solve x²=4.</p><ol><li>Explain. [3]</li></ol>';
  assert.equal(displayMarkup(stem), '<p>Solve x²=4.</p><ol><li>Explain. [3]</li></ol>');
  assert.equal(displayMarkup('<p><strong>Maths4U Original · Short practice · Recall</strong></p><p>Find x.</p>'), '<p><strong>Short practice · Recall</strong></p><p>Find x.</p>');
});

test("editorial provenance is absent from learner projections and preserved internally", () => {
  const footer = '<p class="muted">AI-assisted preparation from independent skill briefs. Teacher editorial review is pending.</p>';
  const teaching = '<h2>Composite functions</h2><p>Use \\(f(g(x))\\).</p>';
  assert.equal(displayMarkup(teaching + footer), teaching);
  assert.equal(displaySource("Maths4U Original (AI-assisted)"), undefined);
  assert.equal(displaySource("Cambridge"), "Cambridge");
  const note = JSON.stringify({ provenance: { prepared_by: "AI-assisted preparation", teacher_review: "pending" } });
  assert.equal(displayTeacherNote(note), ""); assert.equal(displayTeacherNote(note, true), note);
  const prefixedNote = 'Use a valid substitution.\n' + JSON.stringify({ editorialUid: "example", provenance: { teacher_review: "pending", prepared_by: "AI-assisted preparation" } });
  assert.equal(displayTeacherNote(prefixedNote), "Use a valid substitution.");assert.equal(displayTeacherNote(prefixedNote, true), prefixedNote);
  assert.equal(displayTeacherNote("Award the method mark for a valid substitution."), "Award the method mark for a valid substitution.");
  const version = { id: "v", taskId: "t", source: { name: "Maths4U Original (AI-assisted)" }, assets: [], parts: [{ id: "part", kind: "MANUAL", maxPoints: 3, acceptedAnswers: [], options: [], texts: [{ locale: "en", prompt: "Explain the substitution.", answer: "Answer", rubric: "M1", markScheme: "M1", markSchemeText: "M1", markSchemeStatus: "DRAFT" }] }], texts: [{ locale: "en", title: "Composite functions", statement: teaching, answer: "Answer", hint: "Hint", solution: "Solution", markScheme: "M1", markSchemeText: "M1", markSchemeStatus: "DRAFT" }] } as unknown as Version;
  const before = JSON.stringify(version), shown = publicVersion(version, "en", true);
  assert.equal(shown.source, undefined); assert.equal(shown.markSchemeStatus, undefined); assert.equal(shown.separatePartPrompts, true);
  assert.equal(shown.parts[0].markSchemeStatus, undefined);
  assert.doesNotMatch(JSON.stringify(shown), /\bAI\b|AI-assisted|editorial review|DRAFT/);
  const admin = publicVersion(version, "en", true, undefined, undefined, true);
  assert.equal(admin.source, "Maths4U Original (AI-assisted)"); assert.equal(admin.markSchemeStatus, "DRAFT");
  assert.equal(admin.parts[0].markSchemeStatus, "DRAFT");
  assert.equal(JSON.stringify(version), before);
});
test("new Russian teaching content creates availability without a path allowlist", () => {
  const base = [{ id: "new-lesson", slug: "future-9231-course", texts: ["An English lesson."] }];
  assert.equal(hasRussianPage("/courses/future-9231-course", russianAvailability(base)), false);
  const translated = russianAvailability([{ ...base[0], texts: ["<h2>Метод решения</h2><p>Решите уравнение.</p>"] }]);
  assert.equal(hasRussianPage("/courses/future-9231-course", translated), true);
  assert.equal(hasRussianPage("/courses/future-9231-course/topics/new-lesson", translated), true);
  assert.equal(hasRussianPage("/learn/further", translated), true);
  assert.equal(hasRussianPage("/courses/other-course/topics/new-lesson", translated), false);
  assert.equal(hasRussianPage("/student", translated), false);
});
test("programme order is stable and untranslated/interface-only pages are not language pairs", () => {
  assert.deepEqual(["olymp-book", "maths4u-9231-fp1", "maths4u-0606", "maths4u-9709-p1", "school-year7", "igcse-0580"].sort((a,b)=>programOrder(a)-programOrder(b)), ["igcse-0580", "maths4u-0606", "maths4u-9709-p1", "maths4u-9231-fp1", "school-year7", "olymp-book"]);
  const none = russianAvailability([{ id: "x", slug: "olymp-x", texts: ["English notes", ""] }]);
  assert.equal(hasRussianPage("/learn/olympiad", none), false);
  assert.equal(hasRussianPage("/library", none), false);
});
