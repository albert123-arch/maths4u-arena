"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import { Button, Input, Textarea } from "./controls";
import { api, MathContent } from "./ui";
import { editorFormulas, editorTextToMarkup, formulaMarkup, insertEditorText, markupToEditorText, replaceEditorFormula, type EditorFormula } from "@/lib/math-editor-model";

/** Preview HTML comes exclusively from Arena's sanitising, trust:false renderer. */
export function AuthoringPreview({ content, empty = "Your preview appears here." }: { content: string; empty?: string }) {
  const [preview, setPreview] = useState<{ source: string; html: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!content.trim()) return;
    let live = true;
    const timer = window.setTimeout(() => {
      void api<{ html: string }>("teacher/authoring/preview", "POST", { content }).then(result => {
        if (live) { setPreview({ source: content, html: result.html }); setFailed(false); }
      }).catch(() => { if (live) setFailed(true); });
    }, 350);
    return () => { live = false; window.clearTimeout(timer); };
  }, [content]);
  return <div className="ae-preview" aria-label="Mathematical preview" aria-busy={!!content.trim() && preview?.source !== content && !failed}>
    <span className="ae-mini-label">Live preview</span>
    {!content.trim() ? <p className="ae-muted">{empty}</p> : preview?.source === content ? <MathContent html={preview.html} /> : <p className="ae-muted" role="status">{failed ? "Preview is unavailable. Your text is still in the editor." : "Updating preview…"}</p>}
  </div>;
}

const keys = [
  { label: "Fraction", visual: "a⁄b", latex: "\\frac{#?}{#?}" },
  { label: "Square root", visual: "√x", latex: "\\sqrt{#?}" },
  { label: "Power", visual: "xⁿ", latex: "{#?}^{#?}" },
  { label: "Subscript", visual: "xₙ", latex: "{#?}_{#?}" },
  { label: "Sine", visual: "sin", latex: "\\sin\\left(#?\\right)" },
  { label: "Cosine", visual: "cos", latex: "\\cos\\left(#?\\right)" },
  { label: "Tangent", visual: "tan", latex: "\\tan\\left(#?\\right)" },
  { label: "Integral", visual: "∫", latex: "\\int_{#?}^{#?} #?\\,\\mathrm{d}x" },
  { label: "Sum", visual: "∑", latex: "\\sum_{#?}^{#?} #?" },
  { label: "2 by 2 matrix", visual: "[▦]", latex: "\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}" },
  { label: "Pi", visual: "π", latex: "\\pi" },
  { label: "Theta", visual: "θ", latex: "\\theta" },
  { label: "Less than or equal", visual: "≤", latex: "\\le" },
  { label: "Infinity", visual: "∞", latex: "\\infty" },
];

function FormulaComposer({ initial, onInsert, onCancel }: { initial?: EditorFormula; onInsert: (latex: string, display: boolean) => void; onCancel: () => void }) {
  const host = useRef<HTMLDivElement>(null), field = useRef<MathfieldElement | null>(null);
  const [latex, setLatex] = useState(initial?.latex ?? ""), [display, setDisplay] = useState(initial?.display ?? false);
  const [ready, setReady] = useState(false), [failure, setFailure] = useState(false);
  const initialLatex = useRef(initial?.latex ?? ""), caption = useId();
  useEffect(() => {
    let live = true;
    let element: MathfieldElement | null = null;
    const change = () => { if (element) setLatex(element.value); };
    // MathLive's browser runtime and fonts are requested only when this panel opens.
    void import("mathlive").then(({ MathfieldElement }) => {
      if (!live || !host.current) return;
      MathfieldElement.fontsDirectory = "/assets/mathlive/fonts";
      MathfieldElement.soundsDirectory = null;
      element = new MathfieldElement({ smartFence: true, smartMode: false, mathVirtualKeyboardPolicy: "manual" });
      element.value = initialLatex.current;
      element.setAttribute("aria-label", "Visual formula editor");
      element.setAttribute("aria-describedby", caption);
      element.addEventListener("input", change);
      host.current.appendChild(element);
      field.current = element;
      setReady(true);
      element.focus();
    }).catch(() => { if (live) setFailure(true); });
    return () => { live = false; element?.removeEventListener("input", change); element?.remove(); field.current = null; };
  }, [caption]);
  function changeSource(value: string) { setLatex(value); if (field.current && field.current.value !== value) field.current.value = value; }
  return <section className="ae-formula-composer" aria-label={initial ? "Edit formula" : "Insert formula"}>
    <div className="ae-section-head"><h3>{initial ? "Edit formula" : "Build a formula"}</h3><Button type="button" variant="text" onClick={onCancel}>Cancel</Button></div>
    <p className="ae-muted" id={caption}>Choose a symbol, then fill its boxes. Use Tab to move between boxes and arrow keys to move through your formula.</p>
    <div className="ae-formula-keys" aria-label="Formula building blocks">{keys.map(key => <Button key={key.label} type="button" title={key.label} aria-label={key.label} disabled={!ready} onClick={() => { field.current?.focus(); field.current?.insert(key.latex, { insertionMode: "insertAfter", selectionMode: "placeholder" }); if (field.current) setLatex(field.current.value); }}><span aria-hidden="true">{key.visual}</span><small>{key.label}</small></Button>)}</div>
    <div ref={host} className="ae-mathfield-host" />
    {!ready && <p className="ae-muted" role="status">{failure ? "The visual editor could not load. Try closing and reopening it, or use the optional formula source below." : "Loading visual editor…"}</p>}
    <details className="ae-advanced"><summary>Advanced: LaTeX source</summary><label>Formula source<Textarea spellCheck={false} value={latex} onChange={event => changeSource(event.target.value)} rows={3} /></label></details>
    <AuthoringPreview content={latex ? formulaMarkup(latex, display) : ""} empty="Fill the formula boxes to see a preview." />
    <div className="ae-row"><label className="ae-check"><Input type="checkbox" checked={display} disabled={!!initial} onChange={event => setDisplay(event.target.checked)} />Display on its own line</label><Button variant="primary" type="button" disabled={!latex.trim() || /\\placeholder\b|#\?/.test(latex)} onClick={() => onInsert(latex, display)}>{initial ? "Update formula" : "Insert formula"}</Button></div>
  </section>;
}

export type MathEditorProps = { id?: string; label: string; value: string; onChange: (value: string) => void; rows?: number; description?: string; required?: boolean; preview?: boolean };
export function MathEditor({ id, label, value, onChange, rows = 5, description, required = false, preview = true }: MathEditorProps) {
  const uid = useId(), inputId = id ?? uid;
  const [text, setText] = useState(() => markupToEditorText(value)), [composer, setComposer] = useState<{ formula?: EditorFormula; start: number; end: number } | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null), emitted = useRef(value);
  useEffect(() => { if (value !== emitted.current) { emitted.current = value; setText(markupToEditorText(value)); } }, [value]);
  function change(next: string) { setText(next); const markup = editorTextToMarkup(next); emitted.current = markup; onChange(markup); }
  function selection() { return { start: textarea.current?.selectionStart ?? text.length, end: textarea.current?.selectionEnd ?? text.length }; }
  function apply(insertion: string, start?: number, end?: number) {
    const selected = selection(), next = insertEditorText(text, start ?? selected.start, end ?? selected.end, insertion);
    change(next.value);
    window.requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.setSelectionRange(next.caret, next.caret); });
  }
  function format(kind: "bold" | "list" | "paragraph") {
    const { start, end } = selection(), selected = text.slice(start, end);
    if (kind === "bold") { apply(`**${selected || "important text"}**`, start, end); return; }
    if (kind === "paragraph") { apply("\n\n", start, end); return; }
    const from = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1, newline = text.indexOf("\n", end), to = newline === -1 ? text.length : newline;
    const lines = text.slice(from, to) || "List item";
    apply(lines.split("\n").map(line => line.startsWith("- ") ? line : "- " + line).join("\n"), from, to);
  }
  const found = editorFormulas(text);
  return <div className="ae-math-editor">
    <label htmlFor={inputId}>{label}{required ? <span className="ae-required">Required</span> : null}</label>
    {description && <p className="ae-muted ae-field-description" id={inputId + "-help"}>{description}</p>}
    <div className="ae-rich-toolbar" aria-label={label + " formatting"}>
      <Button type="button" disabled={!!composer} aria-label={"Bold text in " + label} onClick={() => format("bold")}><strong>B</strong></Button>
      <Button type="button" disabled={!!composer} onClick={() => format("list")}>• List</Button>
      <Button type="button" disabled={!!composer} onClick={() => format("paragraph")}>¶ Paragraph</Button>
      <Button type="button" disabled={!!composer} className="ae-insert-formula" onClick={() => setComposer(selection())}><span aria-hidden="true">ƒx</span> Insert formula</Button>
    </div>
    <textarea ref={textarea} className="ui-textarea" id={inputId} value={text} readOnly={!!composer} onChange={event => change(event.target.value)} rows={rows} required={required} aria-describedby={description ? inputId + "-help" : undefined} placeholder="Write your text here. Add mathematics with Insert formula." />
    {found.length > 0 && <div className="ae-existing-formulas"><span className="ae-mini-label">Edit a formula</span>{found.map((formula, i) => <Button key={i} type="button" onClick={() => setComposer({ formula, start: formula.start, end: formula.end })}>Formula {i + 1}</Button>)}</div>}
    {composer && <FormulaComposer key={composer.start + ":" + composer.end} initial={composer.formula} onCancel={() => { setComposer(null); textarea.current?.focus(); }} onInsert={(latex, display) => {
      if (composer.formula) { const next = replaceEditorFormula(text, composer.formula, latex); change(next.value); window.requestAnimationFrame(() => textarea.current?.focus()); }
      else apply(formulaMarkup(latex, display), composer.start, composer.end);
      setComposer(null);
    }} />}
    {preview && <AuthoringPreview content={value} />}
  </div>;
}
