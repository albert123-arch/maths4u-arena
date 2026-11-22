import { canRoundScalar, type ExactField } from "./exact-answer";
import { hasStatedAnswerPrecision, permitsThreeSignificantFigures, s1FourDecimalPlaces, s1PracticeRounding, s1StudyRounding } from "./s1-answer-precision";

export type LessonPrecision = "statistics-1" | "mechanics" | "further-statistics";

export function studyPrecisionPolicy(lessonId: string): LessonPrecision | undefined {
  if (s1StudyRounding(lessonId)) return "statistics-1";
  if (/^(?:orig_9709_m1_|fm_)/.test(lessonId)) return "mechanics";
  if (/^stats_/.test(lessonId)) return "further-statistics";
}

export function practicePrecisionPolicy(packageKey: string, collection: string): LessonPrecision | undefined {
  if (s1PracticeRounding(packageKey, collection)) return "statistics-1";
  if ((collection === "short" || collection === "variant") && /^(?:9709-m1-|9231-mechanics-)/.test(packageKey)) {
    return "mechanics";
  }
}

// These prompts ask for an exact value in only part of a multi-entry answer.
// Keep the other field eligible for ordinary Mechanics rounding.
const mixedMechanicsPrecision: [RegExp, string[]][] = [
  [/^horizontal-link-speed-period-(?:check|extra)$/, ["period"]],
  [/^vertical-use-height-from-bottom-(?:check|extra)$/, ["rise"]],
  [/^contact-(?:find-first-slackening|outside-contact-equation)-(?:check|extra|follow-up)$/, ["cosine"]],
  [/^stages-rise-past-natural-length-(?:check|extra)$/, ["rise"]],
  [/^stages-spring-launch-to-rough-patch-(?:check|extra|follow-up)$/, ["distance"]],
  [/^stages-impact-then-compression-(?:check|extra)$/, ["compression"]],
  [/^(?:surfaces-rebuild-rebound-direction|spheres-find-outgoing-speed-and-direction)-(?:check|extra)$/, ["tangent"]],
  [/^(?:components-speed-and-direction|trajectories-recover-launch-velocity)-(?:check|extra)$/, ["tan"]],
];

function mechanicsAllowsRounding(id: string, field: ExactField, prompt: string) {
  if (!canRoundScalar(field, true) || /\b(?:number of|count of|degrees)\b/i.test(field.label)) return false;
  if (hasStatedAnswerPrecision(field.label, "")) return false;
  if (mixedMechanicsPrecision.some(([pattern, keys]) => pattern.test(id) && keys.includes(field.key))) return true;

  const exactAfterConjunction = /\b(?:and\s+(?:the|its)|both|all)\s+exact\b/i;
  return !hasStatedAnswerPrecision(field.label, prompt) && !exactAfterConjunction.test(prompt);
}

export function lessonAnswerPrecision(policy: LessonPrecision | undefined, id: string, field: ExactField, prompt: string) {
  if (policy === "mechanics" && mechanicsAllowsRounding(id, field, prompt)
    || policy === "statistics-1" && permitsThreeSignificantFigures(id, field, prompt)) {
    return { significantFigures: 3 as const };
  }
  if (policy === "statistics-1" && s1FourDecimalPlaces(id, field, prompt)
    || policy === "further-statistics" && field.absolute_tolerance === 0.00005 && s1FourDecimalPlaces(id, field, prompt)) {
    return { decimalPlaces: 4 as const };
  }
  return {};
}

export const furtherStatisticsRoundingTip = "Keep intermediate values unrounded. Round the final answer to 4 decimal places.";
