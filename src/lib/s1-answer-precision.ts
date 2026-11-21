import { canRoundScalar, type ExactField } from "./exact-answer";

const lessons = /^orig_9709_s1_(?:rep|ct|var|prob)_/;
const packages = new Set(["9709-s1-representation", "9709-s1-central-tendency", "9709-s1-variation", "9709-s1-probability"]);

// Reviewed requests for exact answers. Short questions and their fresh
// variants share the same precision requirements. Here "*" means every field.
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

// A different requested precision takes precedence. "Recorded to the nearest"
// describes the data, whereas "give your answer to the nearest" limits input.
const otherPrecision = /\b(?:\d+|one|two|three|four|five|six)\s+(?:decimal places?|significant figures?)\b|\b\d+\s*(?:d\.?\s*p|s\.?\s*f)\b|\b(?:answer|result|give|round)[^.!?]{0,30}\bto the nearest\b/i;
const exactForm = /\b(?:as|in)\s+(?:an?\s+)?(?:(?:exact|reduced|simplified)\s+)?(?:fractions?|surds?|exact form)\b|\bwithout rounding\b/i;
const exactRequest = /\b(?:exact|unrounded)\s+(?:numerical\s+)?(?:answers?|values?|results?)\b|\b(?:give|find|calculate|state|determine|recover|report|enter|write|answer)\b[^.!?;]{0,180}\b(?:exact(?!\s+transferred\b)|exactly(?=\s*(?:[.!?;]|for\b|under\b|using\b|$)))\b/i;

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
  const text = prompt.replace(/<[^>]+>/g, " ");
  return requirement !== "*" && !requirement?.includes(field.key)
    && !/\b(?:unrounded|exact(?!\s+transferred\b))\b/i.test(field.label)
    && !otherPrecision.test(field.label + " " + text) && !exactForm.test(field.label)
    && (requirement !== undefined || !exactRequest.test(text) && !exactForm.test(text))
    && canRoundScalar(field);
}
