import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { contentPackageSchema } from "../src/lib/content-package-schema";
import { renderContent } from "../src/lib/content";

const roots = contentPackageSchema.parse(JSON.parse(readFileSync(new URL("../content/original/9231-fp1/roots-v1.json", import.meta.url), "utf8")));
type Path = readonly (string | number)[];

// These are the only presentation fields authorised for the 1.0.1 revision.
// Masking them binds all answer keys, choice options, marks, criteria, identities,
// provenance and other teaching text to the independently audited 1.0.0 package.
const notationPaths: readonly Path[] = [
  ["version"],
  ["lessons", 0, "ideas"],
  ["lessons", 0, "examples", 1, "question"],
  ["lessons", 0, "examples", 1, "solution"],
  ["lessons", 0, "examples", 2, "solution"],
  ["lessons", 1, "ideas"],
  ["lessons", 1, "examples", 0, "solution"],
  ["lessons", 1, "examples", 3, "solution"],
  ["questions", 1, "prompt_html"],
  ["questions", 2, "prompt_html"],
  ["questions", 3, "prompt_html"],
  ["questions", 4, "solution_html"],
  ["questions", 17, "prompt_html"],
  ["questions", 18, "prompt_html"],
  ["questions", 19, "prompt_html"],
  ["questions", 20, "solution_html"],
  ["questions", 36, "solution_html"],
  ["questions", 46, "solution_html"],
  ["questions", 59, "solution_html"],
  ["questions", 61, "solution_html"],
  ["questions", 62, "answer_html"],
  ["questions", 62, "solution_html"],
  ["questions", 63, "solution_html"],
  ["questions", 64, "solution_html"],
  ["questions", 65, "solution_html"],
  ["questions", 66, "solution_html"],
  ["questions", 76, "solution_html"],
  ["questions", 83, "solution_html"],
  ["questions", 86, "solution_html"],
  ["questions", 91, "solution_html"],
];
const protectedSha256 = "7b2041b77d4cab753ad30f796f3c23410bc2e2d0dd25283193e64c5392fc4f0d";

function setAt(value: unknown, path: Path, replacement: unknown) {
  let node = value as Record<string | number, unknown>;
  for (const key of path.slice(0, -1)) node = node[key] as Record<string | number, unknown>;
  node[path.at(-1)!] = replacement;
}

function protectedDigest(value: unknown) {
  const projection = structuredClone(value);
  for (const path of notationPaths) setAt(projection, path, null);
  const canonical = JSON.stringify(projection, (_key, value) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
  return createHash("sha256").update(canonical).digest("hex");
}

test("Roots 1.0.1 changes only approved notation presentation, with the audited mathematics frozen", () => {
  assert.equal(roots.version, "1.0.1");
  assert.equal(roots.lessons.length, 4);
  assert.equal(roots.questions.length, 94);
  assert.equal(notationPaths.length, 30);
  assert.equal(protectedDigest(roots), protectedSha256);

  // Prove that the display-only projection cannot conceal a grading change or
  // an edit to unrelated content, including an incorrect multiple-choice option.
  for (const [path, value] of [
    [["questions", 0, "fields", 0, "expected"], "999"],
    [["questions", 0, "fields", 0, "key"], "changed-key"],
    [["questions", 3, "fields", 0, "options", "A"], "wrong expression"],
    [["questions", 0, "marks"], 99],
    [["questions", 0, "parts", 0, "marking_criteria", 0, "marks"], 99],
    [["questions", 0, "parts", 0, "marking_criteria", 0, "description_html"], "changed criterion"],
    [["lessons", 2, "ideas"], "unapproved teaching edit"],
  ] as const) {
    const changed = structuredClone(roots);
    setAt(changed, path, value);
    assert.notEqual(protectedDigest(changed), protectedSha256, path.join("."));
  }
});

test("Repeated-root questions explain every requested quantity without elementary-sum shorthand", () => {
  for (const uid of ["M4U-9231-RPE-C41", "M4U-9231-RPE-C42"]) {
    const q = roots.questions.find(q => q.id === uid)!;
    assert.match(q.prompt_html, /sum of the roots, sum of all pair products, product of all three roots/);
    assert.match(q.prompt_html, /Count repeated roots as separate root positions/);
    assert.equal(q.fields[0].expected, "A");
    assert.equal(q.marks, 1);
  }
  assert.equal(roots.questions.find(q => q.id === "M4U-9231-RPE-C41")!.fields[0].options!.A, "\\(2u+v,\\ u^2+2uv,\\ u^2v\\)");
  assert.equal(roots.questions.find(q => q.id === "M4U-9231-RPE-C42")!.fields[0].options!.A, "\\(u+2v,\\ 2uv+v^2,\\ uv^2\\)");
});

test("Textbook symmetric sums stay distinct from power sums and all displayed mathematics renders", () => {
  const coefficients = roots.lessons.find(l => l.key === "coefficients")!.ideas;
  const sums = roots.lessons.find(l => l.key === "symmetric-sums")!.ideas;
  assert(coefficients.includes("\\sum\\alpha\\beta=\\alpha\\beta+\\alpha\\gamma+\\beta\\gamma"));
  assert(coefficients.includes("\\sum\\alpha\\beta\\gamma=\\alpha\\beta\\gamma+\\alpha\\beta\\delta+\\alpha\\gamma\\delta+\\beta\\gamma\\delta"));
  assert(sums.includes("S_k=\\sum_{i=1}^{n}r_i^k"));
  assert(sums.includes("S_2"));
  assert(sums.includes("\\sum_{i<j}r_ir_j"));
  assert(sums.includes("For a cubic the triple-product sum has one term"));
  assert(sums.includes("for a quartic it has four terms"));

  const display = [
    ...roots.lessons.flatMap(l => [l.ideas, ...l.examples.flatMap(e => [e.question, e.solution])]),
    ...roots.questions.flatMap(q => [q.prompt_html, q.answer_html, q.solution_html, q.hint_html,
      ...q.fields.flatMap(f => Object.values(f.options ?? {})), ...q.parts.flatMap(p => p.marking_criteria.map(c => c.description_html))]),
  ];
  for (const [index, html] of display.entries()) {
    assert.doesNotMatch(html, /\be_(?:[1-4j]|\{[1-4j]\})/, `display field ${index}`);
    assert(!renderContent(html).includes("katex-error"), `display field ${index}`);
  }
});
