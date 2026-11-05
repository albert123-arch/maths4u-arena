// Server-only content. Do not import this module into a client component.
import extension from "../../content/original/quadratics-extension-20261105-v1.json";
import { quadraticsTeaching } from "./quadratics-notes";
import pack from "../../content/original/completing-square-20261105-v1.json";
import { checkExact, isExpandedPolynomial, type ExactField } from "./exact-answer";
import { renderContent } from "./content";
import { type SquareLesson, type CheckResult, squareVersion, quadraticTopic, type QuadraticTopic } from "./square-model";

type Criterion = { marks: number; code: string; description_html: string };
export type SourceQuestion = { id: string; family_uid: string; title: string; collection: string; prompt_html: string; hint_html: string; solution_html: string; answer_html: string; marks: number; difficulty: number; fields: ExactField[]; marking_criteria?: Criterion[]; parts?: { label: string; marking_criteria: Criterion[] }[]; provenance?: { type: string; past_paper_reference: unknown } };
export function questionCriteria(q: SourceQuestion) { return q.marking_criteria ?? q.parts?.flatMap(p=>p.marking_criteria.map(c=>({...c,code:p.label + " · " + c.code}))) ?? []; }
export const squareQuestions = pack.questions as SourceQuestion[];
if (pack.version !== squareVersion || squareQuestions.length !== 30 || pack.source.is_official_cambridge_material !== false || squareQuestions.some(q => q.provenance && (q.provenance.type !== "original" || q.provenance.past_paper_reference))) throw Error("SQUARE_ORIGINAL_SOURCE_REQUIRED");
export function squareQuestion(uid: string, key = "completing-square") { const q = questionsForTopic(key).find(q => q.id === uid); if (!q) throw Error("UNKNOWN_SQUARE_QUESTION"); return q; }
export function questionsForTopic(key = "completing-square"): SourceQuestion[] {
  quadraticTopic(key);
  return key === "completing-square" ? squareQuestions : extension.questions.filter(q => q.skill === key) as SourceQuestion[];
}
if (extension.source.is_official_cambridge_material !== false || extension.questions.length !== 122 || extension.questions.some(q => q.provenance?.type !== "original" || q.provenance.past_paper_reference)) throw Error("ORIGINAL_SOURCE_REQUIRED");
function label(f: ExactField) {
  return ({ a: "Multiplier a", h: "Centre h (the form uses x − h)", k: "Constant c outside the square", form_a: "Multiplier A", form_h: "Centre H in A(x − H)² + C", form_k: "Outside term C", x: "x at the maximum", roots: "All roots (or all ordered pairs when requested)", h_values: "All parameter h-values", allowed: "All x-values in part (c)", parameters: "All parameter k-values", argmin: "x at the minimum" } as Record<string,string>)[f.key] ?? f.label;
}
function topicLabel(f: ExactField) {
  return ({
    u_domain: "Allowed values of u", p16: "All real x-roots when p = 16",
    restriction: "Combined allowed x-values in part (a)", first: "Solutions of the first equation",
    second_restriction: "Allowed x-values for the second equation", second: "Solutions of the second equation",
    model: "Quadratic equation for the width w", width_domain: "Allowed widths w",
    intersection: "Intersection equation (equal to zero)", equation: "Quadratic equation after substitution",
    parameters: "All parameter values satisfying the condition", k: "Parameter k", p: "Parameter p", c: "Line intercept c",
    point: "Point of contact (x,y)", points: "All ordered pairs (x,y)", slopes: "All tangent slopes m",
    linear_root: "Root in the exceptional linear case", fixed_root: "Root shared by every parameter value",
    two_roots: "Parameters p giving two distinct real roots", opposite_sides: "Parameters p with roots on opposite sides of 1",
    f: "All x-values for f(x) ≤ 0", g: "All x-values for g(x) > 0", negative: "All x-values for F(x) < 0",
    parameter_roots: "All (parameter, root) pairs", roots: f.type === "choice" ? "Number of distinct real roots" : "All valid real roots",
    form_a: "Multiplier A", form_h: "Centre H in A(x − H)² + C", form_k: "Outside term C",
  } as Record<string,string>)[f.key] ?? f.label;
}
const notes = String.raw`<h2>The idea</h2><p>Completing the square rewrites a quadratic as one squared term plus a constant. It reveals the vertex and helps with exact roots, ranges and parameter questions.</p><p>For \(a\ne0\),</p>\[ax^2+bx+c=a\left(x+\frac{b}{2a}\right)^2+c-\frac{b^2}{4a}.\]
<h3>A reliable three-step method</h3><ol><li>Factor out the coefficient of \(x^2\) from the two variable terms.</li><li>Halve the coefficient of \(x\) inside the bracket, square it, then subtract the same amount.</li><li>Multiply the correction by the outside coefficient and simplify. Expand to check.</li></ol>
<h3>Read the completed square</h3><p>In \(y=a(x-h)^2+k\), the vertex is \((h,k)\) and the axis of symmetry is \(x=h\). If \(a>0\), the minimum is \(k\); if \(a<0\), the maximum is \(k\). These statements assume the vertex lies in the allowed domain.</p>
<h3>Exact roots and restricted domains</h3><p>To solve \(a(x-h)^2+k=t\), isolate the square. A positive right-hand side gives two real roots, so keep both signs. Zero gives one repeated root; a negative value gives no real roots.</p><p>On a closed interval, check both endpoints and the vertex if it is inside the interval. Open endpoints require attention: a boundary value may not be attained. For a question about the number of intersections, count only roots in the stated domain.</p>
<h3>Check these common errors</h3><ul><li>\((x+3)^2\) has centre \(-3\), not \(3\).</li><li>The outside multiplier applies to the correction as well as the square.</li><li>A strict inequality excludes its boundary; an equality may add a repeated-root case.</li><li>A range contains \(y\)-values. The domain contains \(x\)-values.</li></ul>`;
const examples = [
  { title: "1 · A fractional shift", question: String.raw`<p>Complete the square in \(2x^2+6x-1\).</p>`, solution: String.raw`<p>First factor out 2 from the variable terms.</p>\[2(x^2+3x)-1=2\left[\left(x+\frac32\right)^2-\frac94\right]-1=2\left(x+\frac32\right)^2-\frac{11}{2}.\]<p>The correction is \(2\times\frac94\). The vertex is \((-\frac32,-\frac{11}{2})\).</p>` },
  { title: "2 · A maximum on a restricted domain", question: String.raw`<p>Find the range of \(g(x)=-2x^2+8x-1\) on \(0\le x\le3\).</p>`, solution: String.raw`\[g(x)=-2(x-2)^2+7.\]<p>The vertex is inside the domain, so the maximum is \(7\). At the endpoints, \(g(0)=-1\) and \(g(3)=5\). The range is \([-1,7]\), with both endpoints included.</p>` },
  { title: "3 · Keep both exact roots", question: String.raw`<p>Solve \(3x^2-12x+5=0\) by completing the square.</p>`, solution: String.raw`\[3(x-2)^2-7=0\quad\Longrightarrow\quad(x-2)^2=\frac73.\]\[x=2\pm\sqrt{\frac73}=2\pm\frac{\sqrt{21}}3.\]<p>There are two roots. Enter both, for example <strong>{2-sqrt(21)/3, 2+sqrt(21)/3}</strong>. A decimal approximation is not an exact answer.</p>` },
  { title: "4 · Count intersections within the domain", question: String.raw`<p>For \(f(x)=(x-2)^2+1\), \(0\le x\le5\), find all levels \(t\) giving two distinct solutions of \(f(x)=t\).</p>`, solution: String.raw`<p>The vertex level is \(1\); it gives only one solution. The left branch reaches \(f(0)=5\), and the right branch reaches \(f(5)=10\). Both branches meet the level precisely when \(1<t\le5\). At \(t=5\), the roots \(0\) and \(4\) both belong to the domain.</p>` },
];
export function squarePublicLesson(topic: QuadraticTopic = quadraticTopic()): SquareLesson {
  const teaching = topic.code === "CS" ? { notes, examples } : quadraticsTeaching[topic.key];
  return { topic, version: topic.version, title: topic.title, notes: renderContent(teaching.notes), examples: teaching.examples.map(e => ({ title: e.title, question: renderContent(e.question), solution: renderContent(e.solution) })), questions: questionsForTopic(topic.key).map(q => ({ uid: q.id, family: q.family_uid, title: q.title, collection: q.collection, prompt: renderContent(q.prompt_html).replace(/class="marks"/g, 'class="square-marks"').replace(/<\/p>\s*\[(\d{1,2})\]<\/li>/g, '</p><span class="square-marks">[$1]</span></li>'), fields: q.fields.map(f => ({ key: f.key, label: topic.code === "CS" ? label(f) : topicLabel(f), type: f.type, ...(f.dimension ? { dimension: f.dimension } : {}), ...(f.factor_variable ? { factor_variable: f.factor_variable } : {}), ...(f.variables ? { variables: f.variables } : {}), ...(f.options ? { options: Object.fromEntries(Object.entries(f.options).map(([k,v]) => [k, renderContent(v)])) } : {}) })), marks: q.marks, manual: /sketch|explain|justify/i.test(q.prompt_html) || q.collection === "exam" || q.collection === "mixed" })) };
}
// Feedback describes an identifiable answer pattern, not an assumed thought process.
// This is server-only: none of the expected values are added to the public DTO.
function matchesFeedbackPattern(f: ExactField, input: string) {
  try { return checkExact(f, input); } catch { return false; }
}
function retryMessage(q: SourceQuestion, f: ExactField, input: string) {
  const multiplier = q.fields.find(x => /^(a|form_a)$/.test(x.key));
  const centre = q.fields.find(x => /^(h|form_h)$/.test(x.key));
  if (multiplier && /^(h|form_h)$/.test(f.key)) {
    if (matchesFeedbackPattern(f, `-(${input})`)) return "This is the opposite centre. The form uses x − h; check the sign of h.";
    return "Halve the coefficient of x inside the bracket, then match the form x − h.";
  }
  if (multiplier && centre && /^(k|form_k)$/.test(f.key)) {
    const a = multiplier.expected, h = centre.expected, k = f.expected;
    if (typeof a === "string" && typeof h === "string" && typeof k === "string" && !matchesFeedbackPattern(multiplier, "1") && !matchesFeedbackPattern(centre, "0")) {
      // Original constant = k + a*h². Subtracting h² instead of a*h² gives this value.
      const missingMultiplier = `(${k})+((${a})-1)*(${h})^2`;
      if (matchesFeedbackPattern({ ...f, expected: missingMultiplier }, input)) return "This matches a correction without the outside multiplier. Multiply the square correction by that coefficient.";
    }
    return "Subtract the square you added inside the bracket, then simplify the outside constant.";
  }
  return ["set", "integers"].includes(f.type) ? "Recheck all values, both roots and included or excluded endpoints." : "Recheck this complete answer.";
}
export function gradeSquare(q: SourceQuestion, answers: Record<string,string>): CheckResult {
  const fields: CheckResult["fields"] = {};
  if (Object.keys(answers).length !== q.fields.length || Object.keys(answers).some(k => !q.fields.some(f => f.key === k))) return { valid: false, correct: false, fields, error: "Complete every labelled field." };
  let valid = true;
  for (const f of q.fields) {
    try { const correct = checkExact(f, answers[f.key]); fields[f.key] = { correct, message: correct ? "Correct." : retryMessage(q, f, answers[f.key]) }; }
    catch { valid = false; fields[f.key] = { correct: false, formatError: true, message: "Check the format. Use fractions, sqrt(...), intervals such as (1,5], or coordinate pairs/triples separated by semicolons. Factors and ratios also use semicolons. Complete every field." }; }
    if (f.key === "expanded" && fields[f.key].correct && !isExpandedPolynomial(answers[f.key], f.variables ?? [])) fields[f.key] = { correct: false, message: "This is equivalent, but this field asks for expanded form. Multiply out the brackets." };
  }
  return { valid, correct: valid && Object.values(fields).every(f => f.correct), fields, ...(!valid ? { error: "Some answers could not be read; no result has been recorded yet." } : {}) };
}
export function squareHelp(q: SourceQuestion, kind: "hint" | "solution") {
  if (kind === "hint") return renderContent(q.hint_html);
  return renderContent(q.answer_html + q.solution_html + "<h3>Indicative Maths4U marking guidance</h3><ul>" + questionCriteria(q).map(c => `<li><strong>${c.code} · ${c.marks}</strong> ${c.description_html}</li>`).join("") + "</ul><p>Check your reasoning and sketches as well as your final answers. This is Maths4U guidance, not an official examination-board mark scheme.</p>");
}
