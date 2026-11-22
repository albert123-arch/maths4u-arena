import { canRoundScalar, type ExactField } from "./exact-answer";
import { additionalMathsInput, classroomAnswerKind, igcseNumberInput, isOrderedVectorField, type ClassroomAnswerKind } from "./igcse-number-input";
import { hasStatedAnswerPrecision, permitsThreeSignificantFigures, s1FourDecimalPlaces, s1PracticeRounding, s1StudyRounding } from "./s1-answer-precision";
import { requestedMixedNumber, type MixedNumberFormat } from "./mixed-number";

export type LessonPrecision = "statistics-1" | "mechanics" | "further-statistics" | "igcse" | "lower-secondary" | "additional-maths";
type AnswerPrecision = { classroom?: ClassroomAnswerKind; significantFigures?: 3; decimalPlaces?: 0 | 1 | 2 | 4; vectorComponents?: true; mixedNumber?: MixedNumberFormat };

export function studyPrecisionPolicy(lessonId: string): LessonPrecision | undefined {
  if (s1StudyRounding(lessonId)) return "statistics-1";
  if (/^(?:orig_9709_m1_|fm_)/.test(lessonId)) return "mechanics";
  if (/^stats_/.test(lessonId)) return "further-statistics";
  if (lessonId.startsWith("igcse-0580-")) return "igcse";
  if (lessonId.startsWith("lower-0862-")) return "lower-secondary";
  if (lessonId.startsWith("addmaths-0606-")) return "additional-maths";
}

export function practicePrecisionPolicy(packageKey: string, collection: string): LessonPrecision | undefined {
  if (s1PracticeRounding(packageKey, collection)) return "statistics-1";
  if ((collection === "short" || collection === "variant") && /^(?:9709-m1-|9231-mechanics-)/.test(packageKey)) {
    return "mechanics";
  }
  if (collection === "short" || collection === "variant") {
    if (packageKey.startsWith("0580-")) return "igcse";
    if (packageKey.startsWith("0862-")) return "lower-secondary";
    if (packageKey.startsWith("0606-")) return "additional-maths";
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

export function lessonAnswerPrecision(policy: LessonPrecision | undefined, id: string, field: ExactField & { schoolDecimalPlaces?: 0 | 1 | 2 }, prompt: string): AnswerPrecision {
  if (policy === "additional-maths" && isOrderedVectorField(field)) return { vectorComponents: true };
  if (policy === "igcse" || policy === "lower-secondary" || policy === "additional-maths") {
    const kind = classroomAnswerKind(field.label, prompt);
    const radians = /\brad(?:ian)?s?\b/i.test(field.label + " " + prompt);
    const classroom = policy === "additional-maths" && kind === "angle" && radians ? "number" : kind;
    const control = { classroom };
    const mixedNumber = policy === "lower-secondary" && field.type === "number" ? requestedMixedNumber(prompt) : undefined;
    if (mixedNumber) return { ...control, mixedNumber };
    if (field.schoolDecimalPlaces !== undefined) return { ...control, decimalPlaces: field.schoolDecimalPlaces };
    if (!canRoundScalar(field) || hasStatedAnswerPrecision(field.label, prompt)
      || /\b(?:in terms of|as a multiple of)\s*(?:\\\(\s*)?(?:\\pi\b|π)/i.test(field.label + " " + prompt)) return control;
    if (classroom === "money") return { ...control, decimalPlaces: 2 as const };
    if (classroom === "angle") return { ...control, decimalPlaces: policy === "lower-secondary" ? 0 as const : 1 as const };
    if (classroom === "bearing" || classroom === "count") return control;
    return { ...control, significantFigures: 3 as const };
  }
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

export function lessonAnswerInput(policy: LessonPrecision | undefined, field: ExactField, answer: string, prompt: string, classroomNotation = false) {
  if (policy === "additional-maths") return additionalMathsInput(field, answer, prompt);
  return classroomNotation ? igcseNumberInput(field, answer, prompt) : answer;
}

export const furtherStatisticsRoundingTip = "Keep intermediate values unrounded. Round the final answer to 4 decimal places.";
