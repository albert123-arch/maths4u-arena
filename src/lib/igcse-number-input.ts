import { disjointCommaBounds, type ExactField } from "./exact-answer";

export const igcseClockLabel = "Time (24-hour clock)";
export const igcsePercentageLabel = "Percentage (number before %)";
export type ClassroomAnswerKind = "number" | "count" | "angle" | "bearing" | "percentage" | "probability" | "money";

export function classroomAnswerKind(label: string, prompt = ""): ClassroomAnswerKind {
  const plain = (value: string) => value.replace(/<[^>]+>/g, " ").trim();
  const instructions = [...prompt.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map(match => plain(match[1])).filter(Boolean);
  const instruction = instructions.at(-1) ?? plain(prompt);
  if (/\bbearing\b/i.test(label) || /\b(?:find|give|write|state|calculate|what is)\b[^.?!]*\bbearing\b/i.test(instruction)) return "bearing";
  if (/\bpercent(?:age)?\b|%/i.test(label) || /\b(?:what percentage|(?:give|write|state|express)\b[^.?!]*\bas a percentage|find the percentage|calculate the percentage)\b/i.test(instruction)) return "percentage";
  if (/\bprobability\b/i.test(label) || /\b(?:find|give|write|state|calculate|what is)\b[^.?!]*\bprobability\b/i.test(instruction)) return "probability";
  if (/\bdegrees?\b|°/i.test(label) || /\b(?:how many degrees|(?:find|give|write|state|calculate|work out|what is)\b[^.?!]*\bangle)\b/i.test(instruction)) return "angle";
  if (/\b(?:pounds|dollars|euros|final price|total cost|new price|amount paid)\b|[£$€]/i.test(label)
    || /[£$€]/.test(prompt) && /\b(?:cost|price|pay|pays|money|amount|balance|change|worth|earned|interest|total|saving)\b/i.test(instruction)
    || /\baccount\b[^.]*\bcredits\b/i.test(prompt) && /\b(?:final total|balance|amount|paid|interest)\b/i.test(instruction)) return "money";
  if (!/\b(?:average|mean|median|rate|density)\b|\bhow many (?:millimetres|centimetres|metres|kilometres|grams|kilograms|millilitres|litres)\b/i.test(label + " " + instruction)
    && /\b(?:number of|how many|count of)\b/i.test(label + " " + instruction)) return "count";
  return "number";
}

function probabilityDecimal(percentage: string): string {
  const negative = /^[-−]/.test(percentage);
  const [whole = "", decimal = ""] = percentage.replace(/^[+−-]/, "").split(".");
  const digits = whole.padStart(3, "0") + decimal;
  const at = Math.max(3, whole.length) - 2;
  return (negative ? "-" : "") + digits.slice(0, at) + "." + digits.slice(at);
}
export function usesClassroomRatio(field: Pick<ExactField, "type" | "label" | "variables">) {
  return field.type === "ratio" && !field.variables?.length && /\bratio$/i.test(field.label);
}

export function isOrderedVectorField(field: Pick<ExactField, "type" | "label">) {
  return field.type === "pairs" && /^Ordered components \(x, y\)$/i.test(field.label);
}

export function additionalMathsInput(field: ExactField, answer: string, prompt: string): string {
  if (field.type === "choice") return answer;
  let value = answer.replace(/sqrt\s*(\d+)(?![\d.])/g, "sqrt($1)");
  const context = field.label + " " + prompt;
  const radians = /\brad(?:ian)?s?\b/i.test(context);
  if (radians && value.includes("°")) return value;
  if (field.type === "set") {
    const degreeContext = /\bdegrees?\b|°|\\circ\b/i.test(context);
    if (degreeContext) value = value.replace(/(?<=\d)\s*°/g, "");
    return disjointCommaBounds(value);
  }
  if (isOrderedVectorField(field)) {
    const components = value.replace(/[−–]/g, "-").replace(/\s+/g, "");
    const term = "((?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:/[1-9]\\d*)?)";
    const pair = new RegExp(`^([+-]?)${term}?([ij])([+-])${term}?([ij])$`).exec(components);
    if (pair && pair[3] !== pair[6]) {
      const first = pair[1] + (pair[2] ?? "1"), second = pair[4] + (pair[5] ?? "1");
      return pair[3] === "i" ? `(${first},${second})` : `(${second},${first})`;
    }
    const single = new RegExp(`^([+-]?)${term}?([ij])$`).exec(components);
    if (single) {
      const component = single[1] + (single[2] ?? "1");
      return single[3] === "i" ? `(${component},0)` : `(0,${component})`;
    }
  }
  return igcseNumberInput(field, value, prompt);
}

/** Preserve exact grading while accepting classroom notation in 0580 and 0862 practice. */
export function igcseNumberInput(field: ExactField, answer: string, prompt = ""): string {
  const value = answer.trim();
  if (field.type === "ratio") {
    if (usesClassroomRatio(field)) {
      const ratio = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(value);
      if (ratio) return `${ratio[1]};${ratio[2]}`;
    }
    const subject = /^Expression for ([a-z])( squared)?$/.exec(field.label);
    const assignment = /^([a-z])\s*(\^\s*2|²)?\s*=\s*(.+)$/.exec(value);
    if (subject && assignment && subject[1] === assignment[1] &&
      Boolean(subject[2]) === Boolean(assignment[2])) {
      return assignment[3];
    }
  }
  if (field.type !== "number") return answer;

  if (field.label === igcseClockLabel) {
    const clock = /^(\d{1,2})[:. ](\d{2})$/.exec(value);
    if (clock && Number(clock[1]) < 24 && Number(clock[2]) < 60) {
      return String(Number(clock[1]) * 100 + Number(clock[2]));
    }
  }
  const kind = classroomAnswerKind(field.label, prompt);
  if (kind === "percentage" || kind === "probability") {
    const percentage = /^([+\-−]?(?:\d+(?:\.\d+)?|\.\d+))\s*%$/.exec(value);
    if (percentage) return kind === "probability" ? probabilityDecimal(percentage[1]) : percentage[1];
  }

  const degrees = /^([+\-−]?(?:\d+(?:\.\d+)?|\.\d+))\s*°$/.exec(value);
  if (degrees && (kind === "angle" || kind === "bearing")) return degrees[1];

  const currency = /^([£$€])\s*([+\-−]?\d+(?:\.\d+)?)$/.exec(value);
  if (currency && kind === "money") {
    const context = field.label + " " + prompt;
    const symbol = /\bpounds\b|£/i.test(context) ? "£" : /\beuros\b|€/i.test(context) ? "€" : /\bdollars\b|\$/i.test(context) ? "$" : undefined;
    if (currency[1] === symbol) return currency[2];
  }

  const mixed = /^([+\-−]?)(\d{1,24})\s+(\d{1,24})\s*[\/⁄]\s*(\d{1,24})$/.exec(value);
  if (!mixed) return answer;
  const [, sign, whole, numerator, denominator] = mixed;
  const part = BigInt(numerator), scale = BigInt(denominator);
  if (part >= scale) return answer;
  const magnitude = BigInt(whole) * scale + part;
  return (sign === "-" || sign === "−" ? "-" : "") + magnitude + "/" + scale;
}
