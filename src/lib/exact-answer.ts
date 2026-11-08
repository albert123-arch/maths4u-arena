/** Bounded exact algebra for independent practice; never eval user input. */
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
  for (let i = 0; i < 4; i++) s = s.replace(/\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))").replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)");
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
function bound(s: string): Bound { s = s.trim(); if (/^\+?(?:inf|infinity|∞)$/i.test(s)) return { key: "+inf", value: Infinity }; if (/^-(?:inf|infinity|∞)$/i.test(s)) return { key: "-inf", value: -Infinity }; return { key: numberKey(s), value: numeric(s) }; }
function setKey(raw: string) {
  if (raw.length > 400) fail();
  const s = raw.trim().replace(/∪/g, "U");
  if (/^(?:empty|none|∅|\{\s*\})$/i.test(s)) return "[]";
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
function pairsKey(raw: string, dimension = 2) {
  if (raw.length > 400) fail();
  if (/^(?:empty|none|∅|\{\s*\})$/i.test(raw.trim())) return "[]";
  const parts = split(raw.trim().replace(/^\{(.*)\}$/, "$1"), ";");
  const pairs = parts.map(p => { const t = p.trim(); if (!t.startsWith("(") || !t.endsWith(")")) fail(); const xs = split(t.slice(1, -1), ","); if (xs.length !== dimension) fail(); return xs.map(numberKey).join("|"); });
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
export type ExactField = { key: string; label: string; type: string; expected: string | string[]; variables?: string[]; options?: Record<string, string>; dimension?: number; factor_variable?: string; form?: "expanded" };
export function checkExact(field: ExactField, input: string): boolean {
  if (typeof input !== "string" || !input.trim() || input.length > 400) fail();
  if (field.type === "choice") { if (!Object.hasOwn(field.options ?? {}, input)) fail(); return input === field.expected; }
  if (field.type === "ratio") {
    const parts=split(input,";"), expected=field.expected;
    if(parts.length!==2 || !Array.isArray(expected)||expected.length!==2)fail();
    const [a,b]=parts.map(p=>poly(p,field.variables)),[c,d]=(expected as string[]).map(p=>poly(p,field.variables));
    // Same denominator domain: do not cancel away an excluded parameter value.
    return proportional(b,d) && same(pmul(a,d),pmul(c,b));
  }
  if (typeof field.expected !== "string") fail();
  const expected=field.expected as string;
  if (field.type === "integers") {
    let s=input.trim(); if (/^(?:empty|none|∅|\{\s*\})$/i.test(s)) return setKey(s)===setKey(expected);
    if(s.startsWith("{")&&s.endsWith("}"))s=s.slice(1,-1);
    for(const value of split(s,",")){const p=polynomialKey(value);if(p.length && (p.length!==1 || p[0][0]!==0 || p[0][1].length!==1 || p[0][1][0][0]!==1 || p[0][1][0][2]!=="1"))return false;}
    return setKey(input)===setKey(expected);
  }
  if (field.type === "set") return setKey(input) === setKey(expected);
  if (field.type === "pairs") return pairsKey(input,field.dimension) === pairsKey(expected,field.dimension);
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
