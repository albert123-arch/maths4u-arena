// This model never renders HTML. Only the server's renderContent output may be
// passed to MathContent; prose typed here is always escaped before it is stored.
const formulas = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|(?<!\\)\$\$([\s\S]*?)\$\$|(?<![\\$])\$([^$\n]+?)(?<!\\)\$(?!\$)/g;
export type EditorFormula = { start: number; end: number; raw: string; latex: string; display: boolean };
export function editorFormulas(value: string): EditorFormula[] {
  return [...value.matchAll(formulas)].map(match => ({ start: match.index!, end: match.index! + match[0].length, raw: match[0], latex: match[1] ?? match[2] ?? match[3] ?? match[4], display: match[2] !== undefined || match[3] !== undefined }));
}
function protect(value: string) {
  let token = "M4UEDITORFORMULA";
  while (value.includes(token)) token += "X";
  const found = editorFormulas(value);
  let index = 0;
  const text = value.replace(formulas, () => `${token}${index++}END`);
  return { text, restore: (text: string) => text.replace(new RegExp(`${token}(\\d+)END`, "g"), (_all, i) => found[Number(i)]?.raw ?? "") };
}
export function escapeEditorText(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function decodeText(value: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (raw, entity: string) => {
    if (!entity.startsWith("#")) return named[entity.toLowerCase()] ?? raw;
    const number = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : raw;
  });
}
export function markupToEditorText(value: string) {
  const saved = protect(value);
  const text = saved.text
    .replace(/<(?:strong|b)>/gi, "**").replace(/<\/(?:strong|b)>/gi, "**")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<li(?:\s[^>]*)?>/gi, "- ").replace(/<\/li>/gi, "\n")
    .replace(/<\/(?:p|h[234]|blockquote|ul|ol)>\s*(?=<(?:p|h[234]|blockquote|ul|ol)\b)/gi, "\n\n")
    .replace(/<\/(?:p|h[234]|blockquote)>/gi, "\n\n")
    .replace(/<\/?(?:p|h[234]|blockquote|ul|ol)(?:\s[^>]*)?>/gi, "")
    .replace(/\n{3,}/g, "\n\n").trimEnd();
  return saved.restore(decodeText(text));
}
export function editorTextToMarkup(value: string) {
  if (!value) return "";
  const saved = protect(value);
  const inline = (text: string) => escapeEditorText(text).replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  const blocks = saved.text.replaceAll("\r\n", "\n").split(/\n\s*\n/).map(block => {
    const lines = block.split("\n");
    if (lines.every(line => /^\s*-\s+/.test(line))) return `<ul>${lines.map(line => `<li>${inline(line.replace(/^\s*-\s+/, ""))}</li>`).join("")}</ul>`;
    if (lines.every(line => /^\s*\d+[.)]\s+/.test(line))) return `<ol>${lines.map(line => `<li>${inline(line.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`;
    return `<p>${lines.map(inline).join("<br>")}</p>`;
  });
  return saved.restore(blocks.join(""));
}
export function insertEditorText(value: string, start: number, end: number, insertion: string) {
  const from = Math.min(value.length, Math.max(0, start)), to = Math.min(value.length, Math.max(from, end));
  return { value: value.slice(0, from) + insertion + value.slice(to), caret: from + insertion.length };
}
export function formulaMarkup(latex: string, display = false) { return display ? `\\[${latex}\\]` : `\\(${latex}\\)`; }
export function replaceEditorFormula(value: string, formula: EditorFormula, latex: string) {
  // Retain the author's original delimiter convention, including dollar math.
  const prefix = formula.raw.startsWith("\\(") ? "\\(" : formula.raw.startsWith("\\[") ? "\\[" : formula.raw.startsWith("$$") ? "$$" : "$";
  const suffix = prefix === "\\(" ? "\\)" : prefix === "\\[" ? "\\]" : prefix;
  return insertEditorText(value, formula.start, formula.end, prefix + latex + suffix);
}
