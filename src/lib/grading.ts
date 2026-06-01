import type { GradingTypeValue } from "./constants";

type GradeResult = {
  isCorrect: boolean | null;
  reason?: string;
};

type Rules = Record<string, unknown>;

function parseRules(gradingRulesJson?: string | null): Rules {
  if (!gradingRulesJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(gradingRulesJson);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function answerValue(answer: unknown) {
  if (
    typeof answer === "object" &&
    answer !== null &&
    "value" in answer &&
    (typeof answer.value === "string" || typeof answer.value === "number")
  ) {
    return String(answer.value);
  }

  if (typeof answer === "string" || typeof answer === "number") {
    return String(answer);
  }

  return "";
}

function normalize(value: string, caseSensitive: unknown) {
  const trimmed = value.trim();
  return caseSensitive === true ? trimmed : trimmed.toLowerCase();
}

function stringRule(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberRule(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

export function gradeAnswer(input: {
  gradingType: GradingTypeValue;
  gradingRulesJson?: string | null;
  answer: unknown;
}): GradeResult {
  const rules = parseRules(input.gradingRulesJson);
  const submitted = answerValue(input.answer);

  if (input.gradingType === "EXACT") {
    return {
      isCorrect:
        normalize(submitted, rules.caseSensitive) ===
        normalize(stringRule(rules.answer), rules.caseSensitive),
    };
  }

  if (input.gradingType === "ACCEPTED_ANSWERS") {
    const answers = Array.isArray(rules.answers) ? rules.answers : [];

    return {
      isCorrect: answers.some(
        (answer) =>
          normalize(submitted, rules.caseSensitive) ===
          normalize(stringRule(answer), rules.caseSensitive),
      ),
    };
  }

  if (input.gradingType === "KEYWORDS") {
    const required = Array.isArray(rules.required) ? rules.required : [];
    const normalizedSubmitted = normalize(submitted, rules.caseSensitive);

    return {
      isCorrect: required.every((keyword) =>
        normalizedSubmitted.includes(normalize(stringRule(keyword), rules.caseSensitive)),
      ),
    };
  }

  if (input.gradingType === "REGEX") {
    try {
      const pattern = stringRule(rules.pattern);
      const flags = stringRule(rules.flags);
      return {
        isCorrect: new RegExp(pattern, flags).test(submitted),
      };
    } catch {
      return {
        isCorrect: null,
        reason: "Invalid regular expression grading rule.",
      };
    }
  }

  if (input.gradingType === "NUMERIC_TOLERANCE") {
    const expected = numberRule(rules.answer);
    const tolerance = numberRule(rules.tolerance);
    const actual = Number(submitted);

    if (!Number.isFinite(expected) || !Number.isFinite(tolerance) || !Number.isFinite(actual)) {
      return {
        isCorrect: false,
      };
    }

    return {
      isCorrect: Math.abs(actual - expected) <= tolerance,
    };
  }

  return {
    isCorrect: null,
    reason: "Manual or future grading type.",
  };
}
