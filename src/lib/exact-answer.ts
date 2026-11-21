/** Bounded exact algebra for independent practice; never eval user input. */
import { isCoordinateField, normaliseAnswerLabel, rangeOutputs, scalarLabels, setSymbol } from "./answer-notation";
type Rat = [bigint, bigint];
type Scalar = Map<number, Rat>; // square-free radical -> rational coefficient
type Poly = Map<number, Scalar>; // base-7 exponents: two declared variables, then the exact constant pi
const fail = (): never => { throw new Error("Use numbers, fractions, sqrt(...), brackets and powers up to 6. Check the answer format."); };
const gcd = (a: bigint, b: bigint): bigint => b ? gcd(b, a % b) : a < BigInt(0) ? -a : a;
function rat(a: bigint, b = BigInt(1)): Rat {
  if (!b || a.toString().length > 90 || b.toString().length > 90) fail();
  if (b < BigInt(0)) { a = -a; b = -b; }
  const g = gcd(a, b); return [a / g, b / g];
}
const radd = (a: Rat, b: Rat) => rat(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const rmul = (a: Rat, b: Rat) => rat(a[0] * b[0], a[1] * b[1]);
function put(s: Scalar, d: number, r: Rat) { const n = radd(s.get(d) ?? [BigInt(0), BigInt(1)], r); if (n[0]) s.set(d, n); else s.delete(d); if (s.size > 16) fail(); }
const scalar = (n: bigint, d = BigInt(1)): Scalar => n ? new Map([[1, rat(n, d)]]) : new Map();
function add(a: Scalar, b: Scalar, sign = BigInt(1)) { const s = new Map(a); for (const [d, r] of b) put(s, d, [r[0] * sign, r[1]]); return s; }
function rootParts(n: number): [number, number] {
  if (!Number.isSafeInteger(n) || n < 0 || n > 1000000) fail();
  let outside = 1; for (let p = 2; p * p <= n; p++) while (n % (p * p) === 0 && n) { outside *= p; n /= p * p; }
  return [outside, n];
}
function mul(a: Scalar, b: Scalar) {
  const s: Scalar = new Map();
  for (const [x, r] of a) for (const [y, t] of b) {
    // gcd of square-free radicands is the factor that leaves the radical.
    const g = Number(gcd(BigInt(x), BigInt(y))), d = (x / g) * (y / g);
    if (d > 1000000) fail(); put(s, d, rmul(rmul(r, t), [BigInt(g), BigInt(1)]));
  } return s;
}
function inv(s: Scalar, depth = 0): Scalar {
  if (!s.size || depth > 10) fail();
  if (s.size === 1 && s.has(1)) { const r = s.get(1)!; return new Map([[1, rat(r[1], r[0])]]); }
  const d = [...s.keys()].find(k => k > 1)!;
  let p = 2; while (p * p <= d && d % p) p++; if (d % p) p = d;
  const conjugate: Scalar = new Map([...s].map(([k, r]) => [k, [k % p === 0 ? -r[0] : r[0], r[1]]]));
  return mul(conjugate, inv(mul(s, conjugate), depth + 1));
}
const constant = (s: Scalar): Poly => s.size ? new Map([[0, s]]) : new Map();
function padd(a: Poly, b: Poly, sign = BigInt(1)): Poly { const p = new Map(a); for (const [k, s] of b) { const n = add(p.get(k) ?? new Map(), s, sign); if (n.size) p.set(k, n); else p.delete(k); } return p; }
function pmul(a: Poly, b: Poly): Poly { let p: Poly = new Map(); for (const [i, x] of a) for (const [j, y] of b) { const first = i % 7 + j % 7, second = Math.floor(i / 7) % 7 + Math.floor(j / 7) % 7, pi = Math.floor(i / 49) + Math.floor(j / 49); if (first + second + pi > 6) fail(); p = padd(p, new Map([[first + 7 * second + 49 * pi, mul(x, y)]])); if (p.size > 28) fail(); } return p; }
function pscalar(p: Poly) { if ([...p.keys()].some(k => k !== 0)) fail(); return p.get(0) ?? new Map<number, Rat>(); }
function normalize(raw: string) {
  if (raw.length > 400) fail();
  let s = raw.trim().replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/²/g, "^2").replace(/³/g, "^3").replace(/π|\\pi(?![a-z])/g, "pi").replace(/\\(?:left|right)/g, "").replace(/\\(?:cdot|times)/g, "*");
  for (let i = 0; i < 4; i++) s = s.replace(/\\(?:[dt]?frac)\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))").replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)");
  return s.replace(/√\(([^()]*)\)/g, "sqrt($1)").replace(/√(\d+)/g, "sqrt($1)").replace(/\*\*/g, "^").replace(/\s+/g, "");
}
export function polynomialKey(raw: string, variables: string[] = []): [number, [number, string, string][]][] {
  const s = normalize(raw), tokens = s.match(/sqrt|pi|\d+(?:\.\d*)?|\.\d+|[a-z]|[()+*/^\-]/g) ?? [];
  if (!s || tokens.join("") !== s || tokens.length > 120 || variables.length > 2 || new Set(variables).size !== variables.length || variables.some(v=>!/^\w$/.test(v))) fail();
  let at = 0, depth = 0;
  const take = (t: string) => tokens[at] === t ? (at++, true) : false;
  function expr(): Poly { let p = term(); while (tokens[at] === "+" || tokens[at] === "-") { const sign = tokens[at++] === "+" ? BigInt(1) : -BigInt(1); p = padd(p, term(), sign); } return p; }
  function term(): Poly {
    let p = unary();
    while (at < tokens.length) {
      if (take("*")) p = pmul(p, unary());
      else if (take("/")) p = pmul(p, constant(inv(pscalar(unary()))));
      else if (/^(?:\d|\.|[a-z]|\()/.test(tokens[at])) p = pmul(p, unary());
      else break;
    } return p;
  }
  function unary(): Poly { if (take("+")) return unary(); if (take("-")) return pmul(constant(scalar(-BigInt(1))), unary()); return power(); }
  function power(): Poly {
    let p = atom();
    if (take("^")) { const n = tokens[at++]; if (!/^[0-6]$/.test(n ?? "")) fail(); const base = p; p = constant(scalar(BigInt(1))); for (let i = 0; i < Number(n); i++) p = pmul(p, base); }
    return p;
  }
  function atom(): Poly {
    if (++depth > 24) fail();
    try {
      if (take("(")) { const p = expr(); if (!take(")")) fail(); return p; }
      if (take("pi")) return new Map([[49,scalar(BigInt(1))]]);
      if (take("sqrt")) {
        if (!take("(")) fail(); const v = pscalar(expr()); if (!take(")") || [...v.keys()].some(k => k !== 1)) fail();
        const [n, d] = v.get(1) ?? [BigInt(0), BigInt(1)]; if (n < 0 || n * d > BigInt(1000000)) fail();
        if (!n) return new Map(); const [a, b] = rootParts(Number(n * d)); return constant(new Map([[b, rat(BigInt(a), d)]]));
      }
      const t = tokens[at++];
      if (variables.includes(t)) return new Map([[7 ** variables.indexOf(t), scalar(BigInt(1))]]);
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(t ?? "")) fail();
      const parts = t.split("."), digits = parts[1]?.length ?? 0; return constant(scalar(BigInt(parts.join("")), BigInt(10) ** BigInt(digits)));
    } finally { depth--; }
  }
  const p = expr(); if (at !== tokens.length) fail();
  return [...p].sort(([a], [b]) => a - b).map(([k, v]) => [k, [...v].sort(([a], [b]) => a - b).map(([d, r]) => [d, r[0].toString(), r[1].toString()])]);
}
const numberKey = (s: string) => JSON.stringify(polynomialKey(s));
/** An expanded answer is a sum of monomials, not an unevaluated squared binomial. */
export function isExpandedPolynomial(raw: string, variables: string[]) {
  let s = normalize(raw);
  while (s[0] === "(" && s.at(-1) === ")") {
    let depth = 0, whole = true;
    for (let i = 0; i < s.length - 1; i++) { if (s[i] === "(") depth++; if (s[i] === ")") depth--; if (depth === 0) { whole = false; break; } }
    if (!whole) break; s = s.slice(1,-1);
  }
  let depth = 0, start = 0; const terms: string[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++; if (s[i] === ")") depth--;
    if (i > start && depth === 0 && "+-".includes(s[i]) && !"+-*/^".includes(s[i-1])) { terms.push(s.slice(start,i)); start=i; }
  }
  terms.push(s.slice(start));
  return terms.every(term=>polynomialKey(term,variables).length<=1);
}
function numeric(s: string) { return polynomialKey(s).reduce((sum, [power, terms]) => sum + Math.PI ** Math.floor(power / 49) * (terms as [number, string, string][]).reduce((n, [d, a, b]) => n + Number(a) / Number(b) * Math.sqrt(d), 0), 0); }
/** Split at separators only outside round/square/curly brackets. */
function split(s: string, separator: string) {
  const out: string[] = []; let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) { if ("([{".includes(s[i])) depth++; if (")]}".includes(s[i])) depth--; if (!depth && s[i] === separator) { out.push(s.slice(start, i)); start = i + 1; } if (depth < 0) fail(); }
  if (depth) fail(); out.push(s.slice(start)); return out;
}
type Bound = { key: string; value: number };
type Interval = { low: Bound; high: Bound; lc: boolean; hc: boolean };
const emptySetAnswer = /^(?:empty|none|no(?:\s+real)?\s+solutions?|∅|\{\s*\})$/i;
function bound(raw: string): Bound {
  const value = raw.trim().replace(/[−–]/g, "-").replace(/\\infty/g, "∞");
  if (/^\+?(?:inf|infinity|∞)$/i.test(value)) return { key: "+inf", value: Infinity };
  if (/^-(?:inf|infinity|∞)$/i.test(value)) return { key: "-inf", value: -Infinity };
  return { key: numberKey(value), value: numeric(value) };
}
function setIntervals(raw: string): Interval[] {
  if (raw.length > 400) fail();
  const s = raw.trim().replace(/∪/g, "U");
  if (emptySetAnswer.test(s)) return [];
  const intervals: Interval[] = [];
  for (const part of split(s, "U")) {
    const t = part.trim();
    if (t.startsWith("{") && t.endsWith("}")) {
      for (const v of split(t.slice(1, -1), ",")) { const b = bound(v); if (!Number.isFinite(b.value)) fail(); intervals.push({ low: b, high: b, lc: true, hc: true }); }
    } else if (/^[[(]/.test(t) && /[)\]]$/.test(t)) {
      const ends = split(t.slice(1, -1), ","); if (ends.length !== 2) fail(); const low = bound(ends[0]), high = bound(ends[1]), lc = t[0] === "[", hc = t.at(-1) === "]";
      if (low.value > high.value || low.value === Infinity || high.value === -Infinity || (!Number.isFinite(low.value) && lc) || (!Number.isFinite(high.value) && hc)) fail();
      if (low.key === high.key && !(lc && hc)) continue;
      intervals.push({ low, high, lc, hc });
    } else { // A comma-separated finite root set is also accepted.
      for (const v of split(t, ",")) { const b = bound(v); if (!Number.isFinite(b.value)) fail(); intervals.push({ low: b, high: b, lc: true, hc: true }); }
    }
  }
  return intervals;
}
function canonicalSet(intervals: Interval[]) {
  intervals.sort((a, b) => a.low.value - b.low.value || Number(b.lc) - Number(a.lc));
  const merged: Interval[] = [];
  for (const i of intervals) {
    const last = merged.at(-1);
    if (last && (i.low.value < last.high.value || i.low.key === last.high.key && (i.lc || last.hc))) {
      if (i.high.value > last.high.value) { last.high = i.high; last.hc = i.hc; }
      else if (i.high.key === last.high.key) last.hc ||= i.hc;
    } else merged.push({ ...i });
  }
  return JSON.stringify(merged.map(i => [i.low.key, i.high.key, i.lc, i.hc]));
}
const setKey = (raw: string) => canonicalSet(setIntervals(raw));

export class AnswerVariableError extends Error {
  constructor(message: string, readonly formatOnly = false) { super(message); }
}

function checkVariable(name: string, allowed: string[], range: boolean) {
  if (!allowed.length) allowed.push(name);
  if (allowed.some(label => normaliseAnswerLabel(label) === normaliseAnswerLabel(name))) return;
  if (range && normaliseAnswerLabel(name) === "x") {
    throw new AnswerVariableError("The range describes output values. Write your inequality using " +
      allowed.slice(0, 2).join(" or ") + ". The variable x describes the domain.");
  }
  throw new AnswerVariableError("This field asks for " + allowed.slice(0, 2).join(" or ") + ". Use that symbol in your answer.");
}

const answerVariable = /^(?:[a-z](?:\^-1)?(?:\(x\))?|lambda)$/i;

function comparisonInterval(raw: string, allowed: string[], range: boolean): Interval | undefined {
  const parts = raw.split(/(<=|>=|<|>)/).map(part => part.trim());
  if ((parts.length !== 3 && parts.length !== 5) || parts.includes("")) return fail();
  const signs = parts.filter((_, i) => i % 2 === 1);
  if (signs.length === 2 && signs[0][0] !== signs[1][0]) return fail();
  if (signs[0][0] === ">") parts.reverse();

  const index = parts.findIndex((part, i) => i % 2 === 0 && answerVariable.test(normaliseAnswerLabel(part)));
  if (index < 0 || (parts.length === 5 && index !== 2)) return fail();
  const low = index === 0 ? "-inf" : parts[0];
  const high = index === parts.length - 1 ? "inf" : parts.at(-1)!;
  const lower = bound(low), upper = bound(high);
  checkVariable(parts[index].trim(), allowed, range);
  const lc = Number.isFinite(lower.value) && !!parts[index - 1]?.includes("=");
  const hc = Number.isFinite(upper.value) && !!parts[index + 1]?.includes("=");
  if (lower.value > upper.value || (lower.key === upper.key && !(lc && hc))) return undefined;
  return { low: lower, high: upper, lc, hc };
}

// Read natural lists of individual roots without changing interval syntax.
function statedValues(raw: string, allowed: string[], range: boolean) {
  const connector = /\b(?:or|and)\b/gi;
  const signPattern = /±|\+\/-|\\pm/;
  if (!raw.includes("=") && !connector.test(raw) && !signPattern.test(raw)) return raw;
  let list = raw.trim();
  if (list.startsWith("{") && list.endsWith("}")) list = list.slice(1, -1);
  let variable: string | undefined;
  const values = split(list.replace(connector, ","), ",").flatMap(part => {
    const assignment = /^\s*([^=]+?)\s*=\s*/.exec(part);
    const label = assignment ? normaliseAnswerLabel(assignment[1]) : undefined;
    if (label && !answerVariable.test(label)) return fail();
    if (label && variable && label !== variable) fail();
    if (label) {
      checkVariable(label, allowed, range);
      variable = label;
    }
    const value = part.slice(assignment?.[0].length ?? 0);
    const sign = signPattern.exec(value)?.[0];
    return sign ? [value.replace(sign, "+"), value.replace(sign, "-")] : [value];
  });
  return "{" + values.join(",") + "}";
}

function intersection(a: Interval, b: Interval): Interval | undefined {
  const low = a.low.value >= b.low.value ? a.low : b.low;
  const high = a.high.value <= b.high.value ? a.high : b.high;
  const lc = (a.low.key !== low.key || a.lc) && (b.low.key !== low.key || b.lc);
  const hc = (a.high.key !== high.key || a.hc) && (b.high.key !== high.key || b.hc);
  if (low.value > high.value || (low.key === high.key && !(lc && hc))) return undefined;
  return { low, high, lc, hc };
}

function absoluteValueIntervals(clause: string, allowed: string[], range: boolean): Interval[] {
  const parts = clause.trim().split(/(<=|>=|<|>|=)/).map(part => part.trim());
  if (parts.length !== 3) return fail();
  const variable = /^\|(.+)\|$/;
  let label = variable.exec(parts[0])?.[1];
  let sign = parts[1], endpoint = parts[2];
  if (!label) {
    label = variable.exec(parts[2])?.[1];
    sign = sign.replace(/[<>]/, symbol => symbol === "<" ? ">" : "<");
    endpoint = parts[0];
  }
  if (!label || !answerVariable.test(normaliseAnswerLabel(label))) return fail();
  checkVariable(label.trim(), allowed, range);
  const radius = bound(endpoint);
  if (!Number.isFinite(radius.value)) return fail();
  if (radius.value < 0) return sign.startsWith(">") ? setIntervals("(-inf,inf)") : [];
  const negative = bound("-(" + endpoint + ")");
  if (sign === "=") return [negative, radius].map(b => ({ low: b, high: b, lc: true, hc: true }));
  const closed = sign.includes("=");
  if (sign.startsWith("<")) {
    return radius.value === 0 && !closed ? [] : [{ low: negative, high: radius, lc: closed, hc: closed }];
  }
  return [
    { low: bound("-inf"), high: negative, lc: false, hc: closed },
    { low: radius, high: bound("inf"), lc: closed, hc: false },
  ];
}

const hasSetCondition = /[<>]|!=|[∈|]/;

function comparisonSet(clause: string, allowed: string[], range: boolean): Interval[] {
  if (clause.includes("∈")) {
    const [variable, set, ...extra] = clause.split("∈").map(part => part.trim());
    if (extra.length || !set || !answerVariable.test(normaliseAnswerLabel(variable))) return fail();
    checkVariable(variable, allowed, range);
    return /^(?:r|ℝ)$/i.test(set) ? setIntervals("(-inf,inf)") : setIntervals(set);
  }
  if (clause.includes("|")) return absoluteValueIntervals(clause, allowed, range);
  if (!hasSetCondition.test(clause)) return setIntervals(statedValues(clause, allowed, range));
  if (!clause.includes("!=")) {
    const ordered = comparisonInterval(clause, allowed, range);
    return ordered ? [ordered] : [];
  }
  const sides = clause.split("!=").map(side => side.trim());
  const variable = sides.findIndex(side => answerVariable.test(normaliseAnswerLabel(side)));
  if (sides.length !== 2 || variable < 0) return fail();
  const excluded = bound(sides[1 - variable]);
  if (!Number.isFinite(excluded.value)) return fail();
  checkVariable(sides[variable], allowed, range);
  return [
    { low: bound("-inf"), high: excluded, lc: false, hc: false },
    { low: excluded, high: bound("inf"), lc: false, hc: false },
  ];
}

function answerSetKey(field: ExactField, raw: string, prompt?: string) {
  const outputs = rangeOutputs(field, prompt);
  const symbol = setSymbol(field);
  const allowed = outputs ?? (symbol ? [symbol] : []);
  const range = !!outputs;
  const input = raw.replace(/≤|\\leq?(?![a-z])/g, "<=").replace(/≥|\\geq?(?![a-z])/g, ">=")
    .replace(/≠|\\neq?(?![a-z])/g, "!=")
    .replace(/\\(?:left|right)(?=\|)/g, "").replace(/\\in(?![a-z])|\bin\b/gi, "∈").replace(/\\mathbb\{R\}/g, "ℝ")
    .replace(/([)\]}])\s*\bor\b\s*(?=\(|\[|\{)/gi, "$1 ∪ ");
  if (!hasSetCondition.test(input)) {
    const branches = input.split(/∪|\bU\b/);
    return canonicalSet(branches.flatMap(branch => setIntervals(statedValues(branch, allowed, range))));
  }
  const intervals: Interval[] = [];
  for (const branch of input.replace(/\bor\b/gi, "∪").split(/∪|\bU\b/)) {
    if (!hasSetCondition.test(branch)) {
      intervals.push(...setIntervals(statedValues(branch, allowed, range)));
      continue;
    }
    const constraints = branch.split(/\band\b/i).flatMap(part => split(part, ","))
      .map(clause => comparisonSet(clause, allowed, range));
    const common = constraints.reduce((remaining, next) => remaining.flatMap(interval => next.flatMap(other => {
      const overlap = intersection(interval, other);
      return overlap ? [overlap] : [];
    })));
    intervals.push(...common);
  }
  return canonicalSet(intervals);
}

function pairsKey(raw: string, dimension = 2, coordinates = false) {
  if (raw.length > 400) fail();
  if (emptySetAnswer.test(raw.trim())) return "[]";
  function tuple(entries: string[]) {
    if (entries.length !== dimension) return fail();
    if (coordinates && dimension === 2 && entries.some(part => part.includes("="))) {
      const labelled = entries.map(part => /^([xy])\s*=\s*(.+)$/.exec(part.trim()));
      const x = labelled.find(match => match?.[1] === "x"), y = labelled.find(match => match?.[1] === "y");
      if (!x || !y) return fail();
      entries = [x[2], y[2]];
    }
    const choices = entries.map(entry => entry.replace(/\+\/-|\\pm/g, "±"));
    const signs = choices.join("").match(/±/g)?.length ?? 0;
    if (!signs) return [entries.map(numberKey).join("|")];
    if (!coordinates || dimension !== 2 || signs !== 1) return fail();
    return ["+", "-"].map(sign => choices.map(entry => numberKey(entry.replace("±", sign))).join("|"));
  }
  const list = raw.trim().replace(/^\{(.*)\}$/, "$1").replace(/\)\s+and\s+(?=\()/gi, ");");
  const pairs = split(list, ";").flatMap(group => {
    const entries = split(group, ",").map(part => part.trim());
    if (coordinates && dimension === 2 && /^[xy]\s*=/.test(entries[0])) {
      const labelledPairs: string[] = [];
      for (let i = 0; i < entries.length; i += 2) labelledPairs.push(...tuple(entries.slice(i, i + 2)));
      return labelledPairs;
    }
    return entries.flatMap(entry => {
      if (!entry.startsWith("(") || !entry.endsWith(")")) return fail();
      return tuple(split(entry.slice(1, -1), ","));
    });
  });
  return JSON.stringify([...new Set(pairs)].sort());
}
function poly(raw: string, variables: string[] = []): Poly { return new Map(polynomialKey(raw, variables).map(([power,terms])=>[power,new Map(terms.map(([d,n,q])=>[d,rat(BigInt(n),BigInt(q))]))])); }
function same(a: Poly,b: Poly) { return padd(a,b,-BigInt(1)).size === 0; }
function proportional(a: Poly,b: Poly) {
  if (!a.size || !b.size) return false;
  const power = [...b.keys()].sort((a,b)=>a-b)[0], left = a.get(power);
  return !!left && same(a,pmul(b,constant(mul(left,inv(b.get(power)!)))));
}
function equation(raw:string,variables:string[]) { const sides=raw.split("="); if(sides.length>2)fail();return padd(poly(sides[0],variables),poly(sides[1]??"0",variables),-BigInt(1)); }
export type ExactField = { key: string; label: string; type: string; expected: string | string[]; variables?: string[]; options?: Record<string, string>; dimension?: number; factor_variable?: string; form?: "expanded"; absolute_tolerance?:number; minimum?:number; maximum?:number };

/** A study exercise can name one exact inverse-trig constant to compare symbolically. */
export type InverseAngle = { fn: "asin" | "acos" | "atan"; argument: string };

export function checkExactInverseAngle(field: ExactField, input: string, angle: InverseAngle) {
  if (typeof field.expected !== "string") return fail();
  const expectedArgument = poly(angle.argument);
  function expression(raw: string) {
    const text = normalize(raw.replace(/\\!/g, "")
      .replace(/\\?arc(sin|cos|tan)/g, "a$1")
      .replace(/\\?(sin|cos|tan)\s*(?:\^\{?-1\}?|⁻¹)/g, "a$1"));
    if (text.includes("z")) return fail();
    const calls = /a(sin|cos|tan)\(/g;
    let result = "", from = 0;
    for (let match = calls.exec(text); match; match = calls.exec(text)) {
      let end = calls.lastIndex, depth = 1;
      for (; end < text.length && depth > 0; end++) {
        if (text[end] === "(") depth++;
        if (text[end] === ")") depth--;
      }
      if (depth) return fail();
      const argument = text.slice(calls.lastIndex, end - 1);
      const value = poly(argument);
      const sameFunction = match[0] === angle.fn + "(";
      let constant: string;
      if (sameFunction && same(value, expectedArgument)) constant = "z";
      else if (sameFunction && angle.fn !== "acos" && !padd(value, expectedArgument).size) constant = "(-z)";
      else if (!sameFunction && match[1] !== "tan" && angle.fn !== "atan"
          && numeric(argument) >= 0 && numeric(angle.argument) >= 0
          && same(padd(pmul(value, value), pmul(expectedArgument, expectedArgument)), poly("1"))) constant = "z";
      else return undefined;
      result += text.slice(from, match.index) + constant;
      from = end;
      calls.lastIndex = end;
    }
    return result + text.slice(from);
  }
  if (field.type === "set") {
    function angleSet(raw: string) {
      if (raw.length > 400) return fail();
      const values = statedValues(raw.replace(/\\(?:left|right)/g, "").replace(/\\([{}])/g, "$1"),
        field.variables ?? [], false).trim();
      const set = values.startsWith("{") && values.endsWith("}") ? values.slice(1, -1) : values;
      const keys = new Set<string>();
      for (const value of split(set, ",")) {
        const angleExpression = expression(value);
        if (angleExpression === undefined) return undefined;
        keys.add(JSON.stringify(polynomialKey(angleExpression, ["z"])));
      }
      return JSON.stringify([...keys].sort());
    }
    const actual = angleSet(input);
    return actual !== undefined && actual === angleSet(field.expected);
  }
  const answer = expression(scalarAnswerValue(field, input));
  const expected = expression(field.expected);
  return answer !== undefined && expected !== undefined
    && checkExact({ ...field, expected, variables: ["z"] }, answer);
}
// Feedback for a labelled scalar uses the same mathematical expression as grading.
export function scalarAnswerValue(field: ExactField, input: string): string {
  if (!["number", "approximate", "polynomial"].includes(field.type)) return input;
  const assignment = /^\s*([^=]+?)\s*=\s*/.exec(input);
  if (!assignment) return input;
  const labels = scalarLabels(field);
  if (!labels.length) return fail();
  if (!labels.some(label => normaliseAnswerLabel(label) === normaliseAnswerLabel(assignment[1]))) {
    throw new AnswerVariableError("Enter the value on its own or label it " + labels[0] + ".", true);
  }
  return input.slice(assignment[0].length);
}

export function isRoundedNumberAnswer(field: ExactField, input: string) {
  if (field.type !== "number" || typeof field.expected !== "string") return false;
  const entered = normalize(scalarAnswerValue(field, input));
  const decimals = /^[+-]?\d*\.(\d+)$/.exec(entered)?.[1].length;
  if (!decimals) return false;
  const exact = numeric(field.expected), decimal = Number(entered);
  return Math.abs(exact - decimal) <= 0.5 * 10 ** -decimals + Math.abs(exact) * Number.EPSILON;
}

function nonIntegerScalar(field: ExactField) {
  if (field.type !== "number" || typeof field.expected !== "string" || field.variables?.length) return undefined;
  const value = numeric(field.expected);
  return Number.isFinite(value) && !Number.isInteger(value) ? value : undefined;
}

export function canRoundScalar(field: ExactField) {
  return nonIntegerScalar(field) !== undefined;
}

/** An optional self-study policy. Assigned exact keys continue to use checkExact. */
export function checkThreeSignificantFigures(field: ExactField, input: string, prompt?: string) {
  const target = nonIntegerScalar(field);
  if (target === undefined) return checkExact(field, input, prompt);
  const entered = normalize(scalarAnswerValue(field, input));
  const decimal = /^[+-]?(\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d{1,3})?$/i.exec(entered);
  if (!decimal) return checkExact(field, input, prompt);
  const value = Number(entered);
  if (!Number.isFinite(value)) return false;
  if (value === target || !/[eE]/.test(entered) && checkExact(field, input, prompt)) return true;

  const magnitude = Math.abs(target), sign = Math.sign(target);
  const exponent = Math.floor(Math.log10(magnitude));
  function rounded(figures: number) {
    const place = exponent - (figures - 1);
    const scaled = magnitude / 10 ** place;
    // Account for binary representation at a decimal half-way value.
    const coefficient = Math.floor(scaled + 0.5 + scaled * Number.EPSILON);
    return Number(`${sign * coefficient}e${place}`);
  }
  const figures = decimal[1].replace(".", "").replace(/^0+/, "").length;
  return value === rounded(3) || figures > 3 && figures <= 15 && value === rounded(figures);
}

function removeOuterBrackets(expression: string) {
  while (expression.startsWith("(") && expression.endsWith(")")) {
    let depth = 0, end = 0;
    do {
      if (expression[end] === "(") depth++;
      if (expression[end] === ")") depth--;
      end++;
    } while (depth && end < expression.length);
    if (end !== expression.length || depth) break;
    expression = expression.slice(1, -1);
  }
  return expression;
}

function ratioParts(input: string) {
  const legacy = split(input, ";");
  if (legacy.length === 2) return legacy;
  const parts = split(removeOuterBrackets(normalize(input)), "/");
  if (legacy.length !== 1 || parts.length !== 2) return fail();
  // An ungrouped sum is not the numerator of a single quotient.
  const numerator = parts[0].replace(/^[+-]/, "");
  const denominator = parts[1].replace(/^[+-]/, "");
  const grouped = removeOuterBrackets(denominator) !== denominator;
  if (split(numerator, "+").length !== 1 || split(numerator, "-").length !== 1 ||
      (!grouped && !/^(?:[a-z]|pi|\d+(?:\.\d+)?)(?:\^[1-6])?$/.test(denominator))) return fail();
  return parts;
}

export function checkExact(field: ExactField, input: string, prompt?: string): boolean {
  if (typeof input !== "string" || !input.trim() || input.length > 400) fail();
  input = scalarAnswerValue(field, input);
  // Opt-in descriptor is saved in the assigned immutable version. Existing
  // exact fields never acquire a tolerance through a later content package.
  if(field.type==="approximate"){
    const target=typeof field.expected==="string"&&field.expected.trim()!==""?Number(field.expected):NaN,tolerance=field.absolute_tolerance;
    if(typeof tolerance!=="number")return fail();
    if(!Number.isFinite(target)||!Number.isFinite(tolerance)||tolerance<=0||tolerance>1||field.variables?.length||field.form)fail();
    for(const value of [field.minimum,field.maximum])if(value!==undefined&&!Number.isFinite(value))fail();
    if(field.minimum!==undefined&&target<field.minimum||field.maximum!==undefined&&target>field.maximum||field.minimum!==undefined&&field.maximum!==undefined&&field.minimum>field.maximum)fail();
    const raw=input.trim().replace(/[−–]/g,"-"),actual=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,3})?$/.test(raw)?Number(raw):numeric(raw);
    if(!Number.isFinite(actual)||field.minimum!==undefined&&actual<field.minimum||field.maximum!==undefined&&actual>field.maximum)return false;
    return Math.abs(actual-target)<=tolerance+8*Number.EPSILON*Math.max(1,Math.abs(actual),Math.abs(target));
  }
  if (field.type === "choice") { if (!Object.hasOwn(field.options ?? {}, input)) fail(); return input === field.expected; }
  if (field.type === "ratio") {
    const parts=ratioParts(input), expected=field.expected;
    if(!Array.isArray(expected)||expected.length!==2)fail();
    const [a,b]=parts.map(p=>poly(p,field.variables)),[c,d]=(expected as string[]).map(p=>poly(p,field.variables));
    // Same denominator domain: do not cancel away an excluded parameter value.
    return proportional(b,d) && same(pmul(a,d),pmul(c,b));
  }
  if (typeof field.expected !== "string") fail();
  const expected=field.expected as string;
  if (field.type === "integers") {
    let s=input.trim(); if (emptySetAnswer.test(s)) return setKey(s)===setKey(expected);
    if(s.startsWith("{")&&s.endsWith("}"))s=s.slice(1,-1);
    for(const value of split(s,",")){const p=polynomialKey(value);if(p.length && (p.length!==1 || p[0][0]!==0 || p[0][1].length!==1 || p[0][1][0][0]!==1 || p[0][1][0][2]!=="1"))return false;}
    return setKey(input)===setKey(expected);
  }
  if (field.type === "set") {
    const values = /\bdegrees\b/i.test(field.label)
      ? input.replace(/(?:°|\^\{?\\circ\}?)(?=\s*(?:[,;}]|$|\b(?:or|and)\b))/g, "")
      : input;
    return answerSetKey(field, values, prompt) === setKey(expected);
  }
  if (field.type === "pairs") return pairsKey(input, field.dimension, isCoordinateField(field)) === pairsKey(expected, field.dimension);
  if (field.type === "equation") return proportional(equation(input,field.variables??[]),equation(expected,field.variables??[]));
  if (field.type === "factors") {
    const parts=split(input,";"), vars=field.variables??[], index=vars.indexOf(field.factor_variable??vars[0]);
    if(parts.length!==2 || index<0)fail();
    const factors=parts.map(p=>poly(p,vars));
    if(factors.some(p=>Math.max(...[...p.keys()].map(k=>index===0?k%7:Math.floor(k/7)%7))!==1))return false;
    return same(pmul(factors[0],factors[1]),poly(expected,vars));
  }
  if (field.type === "polynomial" || field.type === "number") {
    const equivalent = JSON.stringify(polynomialKey(input, field.variables)) === JSON.stringify(polynomialKey(expected, field.variables));
    // Opt in through the immutable assigned descriptor. Older descriptors retain
    // their original equivalence rules; new expansion tasks require the form.
    return equivalent && (field.form !== "expanded" || isExpandedPolynomial(input, field.variables ?? []));
  }
  return fail();
}
