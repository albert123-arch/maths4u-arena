import { test } from "node:test";
import assert from "node:assert/strict";
import { editorFormulas, editorTextToMarkup, markupToEditorText, replaceEditorFormula, insertEditorText } from "../src/lib/math-editor-model";

test("plain prose is escaped while every existing math delimiter is preserved exactly", () => {
  const math = String.raw`\(x<y\) and \[\begin{pmatrix}a&b\\c&d\end{pmatrix}\] and $$\int_0^1 x\,dx$$ and $x^2$`;
  const html = editorTextToMarkup(`<img src=x onerror=alert(1)> & ${math}`);
  assert.ok(html.startsWith("<p>&lt;img src=x onerror=alert(1)&gt; &amp; "));
  assert.ok(html.includes(math));
  assert.equal(markupToEditorText(html), `<img src=x onerror=alert(1)> & ${math}`);
});
test("paragraphs, bold text and lists work without HTML authoring", () => {
  assert.equal(editorTextToMarkup("**Show** your working.\n\n- First step\n- Second step\n\n1. Explain\n2. Check"), "<p><strong>Show</strong> your working.</p><ul><li>First step</li><li>Second step</li></ul><ol><li>Explain</li><li>Check</li></ol>");
});
test("multiline formula internals and mathematical angle brackets survive round trips", () => {
  const raw = String.raw`Find \[\begin{cases}x<2&x>0\\
2&x\le0\end{cases}\].`;
  assert.equal(markupToEditorText(editorTextToMarkup(raw)), raw);
});
test("editing one formula preserves surrounding prose and other formulas", () => {
  const value = String.raw`Use $x^2$ before \(\sqrt{x}\).`;
  const formula = editorFormulas(value)[0];
  assert.equal(replaceEditorFormula(value, formula, "x^3").value, String.raw`Use $x^3$ before \(\sqrt{x}\).`);
  assert.equal(insertEditorText("abc", 1, 2, "XYZ").value, "aXYZc");
});
test("escaped dollars are plain text and entity looking mathematics stays exact", () => {
  const raw = String.raw`Cost \$10; \(a&lt;b\) and \(x&y\).`;
  assert.equal(editorFormulas(raw).length, 2);
  assert.equal(markupToEditorText(editorTextToMarkup(raw)), raw);
});
