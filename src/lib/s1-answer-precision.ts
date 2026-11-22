import { canRoundScalar, scalarAnswerValue, type ExactField } from "./exact-answer";

const lessons = /^orig_9709_s1_(?:rep|ct|var|prob|count|dist|bg|norm)_/;
const packages = new Set([
  "9709-s1-representation", "9709-s1-central-tendency", "9709-s1-variation", "9709-s1-probability",
  "9709-s1-counting", "9709-s1-distributions", "9709-s1-binomial-geometric", "9709-s1-normal",
]);

// Reviewed requests for exact answers. Short questions and their fresh
// variants share the same precision requirements. "*" means every field. An empty
// list records that a precision instruction applies only to the approximate fields.
const exact: Record<string, "*" | readonly string[]> = {
  "S1-S028-20261121-C01": ["lower", "upper"],
  "S1-S028-20261121-C04": "*",
  "S1-S028-20261121-C05": ["increase"],
  "S1-S028-20261121-P04": "*",
  "S1-S029-20261121-P02": "*",
  "S1-S031-20261121-C05": "*",
  "S1-S031-20261121-P01": ["mean"],
  "S1-S032-20261121-P04": ["mean"],
  "S1-S033-20261121-C01": ["mean"],
  "S1-S033-20261121-P01": ["mean"],
  "S1-S033-20261121-P02": "*",
  "S1-S033-20261121-P04": ["median"],
  "S1-S039-20261121-P01": ["sd"],
  "S1-S039-20261121-P03": ["sd"],
  "S1-S040-20261121-P01": "*",
  "S1-S040-20261121-P02": "*",
  "S1-S051-20261121-C06": ["sd"],
  "S1-S055-20261121-C05": ["fee"],
  "S1-S056-20261121-C03": "*",
  "S1-S057-20261121-P03": ["at_least_one"],
  "S1-S058-20261121-P01": "*",
  "S1-S058-20261121-P02": [],
  "S1-S059-20261121-P04": ["mean"],
  "S1-S060-20261121-P04": ["mean"],
  "S1-S062-20261121-C01": [],
  "S1-S062-20261121-C03": [],
  "S1-S062-20261121-P03": ["tail"],
  "S1-S063-20261121-P04": [],
  "S1-S064-20261121-C03": ["boundary", "z"],
  "S1-S064-20261121-C04": ["boundary"],
  "S1-S064-20261121-C05": ["lower", "upper"],
  "S1-S064-20261121-P04": ["lower_boundary"],
  "S1-S064-20261121-P05": ["boundary"],
  "S1-S065-20261121-C01": ["single"],
  "S1-S065-20261121-C03": ["single"],
  "S1-S065-20261121-P01": ["single", "two"],
  "S1-S065-20261121-P02": ["tail", "all"],
  "REP-CHECK-STEM_COMPARISON-4": "*",
  "REP-CHECK-HISTOGRAMS-4": "*",
  "REP-CHECK-CUMULATIVE-2": "*",
  "REP-CHECK-CUMULATIVE-4": "*",
  "CT-CHECK-CENTRE_RAW-1": ["mean"],
  "CT-CHECK-CODING-2": "*",
  "CT-CHECK-FREQUENCY-1": ["mean"],
  "CT-CHECK-FREQUENCY-2": "*",
  "CT-CHECK-FREQUENCY-4": ["median"],
  "CT-CHECK-COMBINING-2": "*",
  "VAR-CHECK-RAW_MOMENTS-1": "*",
  "VAR-CHECK-CODED_TOTALS-1": "*",
  "VAR-CHECK-FREQUENCY_SYNTHESIS-1": "*",
  "VAR-CHECK-FREQUENCY_SYNTHESIS-2": "*",
  "VAR-CHECK-FREQUENCY_SYNTHESIS-3": "*",
};

const statedPrecision = /\b(?:\d+|one|two|three|four|five|six)\s+(?:decimal places?|significant figures?)\b|\b\d+\s*(?:d\.?\s*p|s\.?\s*f)\b/i;
const precisionRequest = /\b(?:give|find|calculate|state|report|enter|write|round)\b[^.!?;]{0,180}?\bto\s+(?:the nearest\b|(?:(?:\d+|one|two|three|four|five|six)\s+(?:decimal places?|significant figures?)\b|\d+\s*(?:d\.?\s*p|s\.?\s*f)\b))/i;
const exactForm = /\b(?:as|in)\s+(?:an?\s+)?(?:(?:exact|reduced|simplified)\s+)?(?:fractions?|surds?|exact form)\b|\bwithout rounding\b/i;
const exactRequest = /\b(?:give|find|calculate|state|determine|recover|report|enter|write|answer)\b\s+(?:(?:the|its|both)\s+)?(?:exact|unrounded)\b|\b(?:give|find|calculate|state|determine|recover|report|enter|write|answer)\b[^.!?;]{0,180}?\bexactly(?=\s*(?:[.!?;]|for\b|under\b|using\b|$))/i;
// Exact-count probabilities and the other listed labels describe the event.
const exactLabel = /^(?:unrounded\b|exact(?:$|\s+(?!(?:gap|qualifying-batch|transferred)\b)))/i;

function plainPrompt(prompt: string) {
  return prompt.replace(/<\/?[a-z][\w-]*(?:\s[^<>]*)?>/gi, " ");
}

export function hasStatedAnswerPrecision(label: string, prompt: string) {
  const text = plainPrompt(prompt);
  return exactLabel.test(label) || statedPrecision.test(label) || exactForm.test(label)
    || precisionRequest.test(text) || exactRequest.test(text) || exactForm.test(text);
}

export function s1StudyRounding(lessonId: string) {
  return lessons.test(lessonId);
}

export function s1PracticeRounding(packageKey: string, collection: string) {
  return packages.has(packageKey) && (collection === "short" || collection === "variant");
}

export function permitsThreeSignificantFigures(checkId: string, field: ExactField, prompt: string) {
  if (field.type !== "number") return false;
  const family = /^M4U-9709-S1-(.*)-[01]$/.exec(checkId)?.[1] ?? checkId;
  const requirement = exact[family];
  const text = plainPrompt(prompt);
  return requirement !== "*" && !requirement?.includes(field.key)
    && !exactLabel.test(field.label)
    && !statedPrecision.test(field.label) && !exactForm.test(field.label)
    && (requirement !== undefined || !precisionRequest.test(text) && !exactRequest.test(text) && !exactForm.test(text))
    && canRoundScalar(field);
}

// These mixed-precision checks request 2 d.p. for their mean/count only.
const twoPlaceFields: Record<string, string> = {
  "S1-S063-20261121-C03": "expected",
  "S1-S063-20261121-C05": "expected",
  "S1-S063-20261121-P03": "mean",
  "S1-S063-20261121-P05": "mean",
};
const fourPlaces = /\b(?:four\s+decimal places?|4\s*(?:decimal places?|d\.?\s*p))\b/i;

export function s1FourDecimalPlaces(checkId: string, field: ExactField, prompt: string) {
  if (field.type !== "approximate") return false;
  if (statedPrecision.test(field.label)) return fourPlaces.test(field.label);
  return twoPlaceFields[checkId] !== field.key
    && /\bto\s+(?:four\s+decimal places?|4\s*(?:decimal places?|d\.?\s*p))\b/i.test(plainPrompt(prompt));
}

export const fourPlaceFeedback = "Give your answer to 4 decimal places.";

export function needsFourPlaceFeedback(field: ExactField, answer: string, numericallyCorrect: boolean) {
  const input = scalarAnswerValue(field, answer).trim().replace(/[−–]/g, "-");
  const decimal = /^[+-]?(?:\d+(?:\.(\d*))?|\.(\d+))$/.exec(input);
  const places = (decimal?.[1] ?? decimal?.[2] ?? "").length;
  // Keep unrounded calculator decimals that meet the authored numeric tolerance.
  if (places >= 4) return false;
  if (numericallyCorrect) return true;
  if (!places || typeof field.expected !== "string" || field.absolute_tolerance === undefined) return false;
  const actual = Number(input), target = Number(field.expected);
  // This window identifies the rounding mistake for feedback only. Acceptance
  // still uses the original table/calculator tolerance and bounds in checkExact.
  return actual >= (field.minimum ?? -Infinity) && actual <= (field.maximum ?? Infinity)
    && Math.abs(actual - target) <= 0.5 * 10 ** -places + field.absolute_tolerance;
}
