import type { ExactField } from "./exact-answer";

export const igcseClockLabel = "Time (24-hour clock)";
export const igcsePercentageLabel = "Percentage (number before %)";
export function usesClassroomRatio(field: Pick<ExactField, "type" | "label" | "variables">) {
  return field.type === "ratio" && !field.variables?.length && /\bratio$/i.test(field.label);
}

/** Preserve exact grading while accepting classroom notation in 0580 and 0862 practice. */
export function igcseNumberInput(field: ExactField, answer: string): string {
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
  if (field.label === igcsePercentageLabel) {
    const percentage = /^([+\-−]?(?:\d+(?:\.\d+)?|\.\d+))\s*%$/.exec(value);
    if (percentage) return percentage[1];
  }

  const pounds = /^£\s*([+\-−]?\d+(?:\.\d+)?)$/.exec(value);
  if (pounds && /\bin pounds\b/i.test(field.label)) return pounds[1];

  const mixed = /^([+\-−]?)(\d{1,24})\s+(\d{1,24})\s*[\/⁄]\s*(\d{1,24})$/.exec(value);
  if (!mixed) return answer;
  const [, sign, whole, numerator, denominator] = mixed;
  const part = BigInt(numerator), scale = BigInt(denominator);
  if (part >= scale) return answer;
  const magnitude = BigInt(whole) * scale + part;
  return (sign === "-" || sign === "−" ? "-" : "") + magnitude + "/" + scale;
}
