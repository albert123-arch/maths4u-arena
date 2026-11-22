export type MixedNumberFormat = "mixed" | "simplest";

export function requestedMixedNumber(prompt: string): MixedNumberFormat | undefined {
  const text = prompt.replace(/<[^>]+>/g, " ");
  const instruction = /\b(?:give|write|express|state)\b[^.!?;]{0,100}\b(?:a|as a) mixed number\b[^.!?;]*/i.exec(text)?.[0];
  if (instruction) return /\bsimplest form\b/i.test(instruction) ? "simplest" : "mixed";
}

type Parts = { whole: string; numerator: string; denominator: string };
const mixed = /^([+\-−]?\d{1,24})\s+(\d{1,24})\s*[\/⁄]\s*(\d{1,24})$/;

export function mixedNumberParts(value: string): Parts {
  // The space and slash also let us preserve unfinished draft fields.
  const parts = /^([+\-−]?\d{0,24}) (\d{0,24})\/(\d{0,24})$/.exec(value) ?? mixed.exec(value.trim());
  if (parts) return { whole: parts[1].replace(/^\+/, "").replace(/^−/, "-"), numerator: parts[2], denominator: parts[3] };
  // Existing drafts may carry a single improper fraction or a decimal.
  const old = /^([+\-−]?)(\d{1,24})(?:\/(\d{1,24})|\.(\d{1,24}))?$/.exec(value.trim());
  if (!old || old[3] && !BigInt(old[3])) return { whole: "", numerator: "", denominator: "" };
  const denominator = old[4] ? BigInt(10) ** BigInt(old[4].length) : BigInt(old[3] || 1);
  const magnitude = BigInt(old[4] ? old[2] + old[4] : old[2]);
  const remainder = magnitude % denominator;
  const factor = gcd(remainder, denominator);
  return {
    whole: (old[1] === "-" || old[1] === "−" ? "-" : "") + magnitude / denominator,
    numerator: String(remainder / factor),
    denominator: String(denominator / factor),
  };
}

function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a;
}

export function mixedNumberFeedback(format: MixedNumberFormat | undefined, value: string): string | undefined {
  const parts = format && mixed.exec(value.trim());
  // The exact-value grader still accepts older single-fraction submissions.
  if (!parts) return undefined;
  const numerator = BigInt(parts[2]), denominator = BigInt(parts[3]);
  if (!denominator) return "The denominator must be greater than zero.";
  if (numerator >= denominator) return "Regroup the fraction so the numerator is smaller than the denominator.";
  if (format === "simplest" && gcd(numerator, denominator) > BigInt(1)) {
    return "Simplify the fractional part by dividing its numerator and denominator by a common factor.";
  }
}
