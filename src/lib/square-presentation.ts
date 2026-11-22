import type { SquareField, SquareQuestion } from "./square-model";
import { isCoordinateField, isIntervalField, rangeOutputs, scalarLabels, setSymbol } from "./answer-notation";

import { igcseClockLabel, igcsePercentageLabel, usesClassroomRatio } from "./igcse-number-input";

// Display labels only: the original IDs, titles and progress keys stay intact.
const titles: Record<string, string> = {
  "M4U-9709-Q26-D01": "Keep every root",
  "M4U-9709-Q26-D02": "Recognise the completed square",
  "M4U-9709-Q26-D03": "Two distinct roots",
  "M4U-9709-Q26-D04": "Choose the whole interval",
  "M4U-9709-Q26-D05": "Match every coordinate pair",
  "M4U-9709-Q26-D06": "Check a square-root substitution",
  "M4U-9709-Q26-M01": "A minimum and its intersections",
  "M4U-9709-Q26-M02": "Solve and validate a substitution",
  "M4U-9709-Q26-M03": "Combine two inequalities",
  "M4U-9709-Q26-M04": "A line meets a circle",
  "M4U-9709-Q26-M05": "One root, including the linear case",
  "M4U-9709-Q26-M06": "Find every tangent and contact point",
};
export function questionTitle(q: Pick<SquareQuestion, "uid" | "title">) { return titles[q.uid] ?? q.title; }

export const exactValueFeedback = "Give the exact value. Use a fraction or sqrt(...) when needed.";

export function answerFormat(f: SquareField): { en: string; ru: string; placeholder: string } {
  if (f.type === "number" && f.label === igcseClockLabel) return {
    en: "Use a 24-hour clock time, for example 08:30 or 0830.",
    ru: "Укажите время в 24-часовом формате, например 08:30 или 0830.",
    placeholder: "08:30",
  };
  if (f.type === "number" && f.label === igcsePercentageLabel) return {
    en: "Give the percentage, for example 25% or 25.",
    ru: "Укажите процент, например 25% или 25.",
    placeholder: "25%",
  };
  if (usesClassroomRatio(f)) return {
    en: "Give both parts in the order asked, for example 2:3.",
    ru: "Запишите обе части в указанном порядке, например 2:3.",
    placeholder: "2:3",
  };
  if (f.type === "set" && f.label === "Error interval for x") return {
    en: "Enter both bounds, for example 4.5 <= x < 5.5 or [4.5, 5.5).",
    ru: "Укажите обе границы, например 4.5 <= x < 5.5 или [4.5, 5.5).",
    placeholder: "4.5 <= x < 5.5",
  };

  if (f.significantFigures === 3) return {
    en: "Enter an exact value or round to 3 significant figures.",
    ru: "Введите точное значение или округлите до 3 значащих цифр.",
    placeholder: "Exact value or 3 significant figures",
  };
  if (f.decimalPlaces === 4) return {
    en: "Give your answer to 4 decimal places.",
    ru: "Запишите ответ с четырьмя знаками после запятой.",
    placeholder: "0.6827",
  };
  if (f.type === "approximate") return { en: "Round as requested in the label, or enter your calculator value. Decimal or fraction input is accepted.", ru: "Округлите как указано в подписи или введите значение калькулятора. Можно ввести десятичное число или дробь.", placeholder: "0.6827" };
  if (f.type === "choice") return { en: "Choose one option. Explain your reasoning on paper.", ru: "Выберите один вариант. Объясните рассуждение на бумаге.", placeholder: "" };
  if (f.type === "integers") return { en: "List every integer in braces, for example {1, 2, 3}; use empty if there are none.", ru: "Перечислите все целые числа в фигурных скобках, например {1, 2, 3}; если их нет, введите empty.", placeholder: "{1, 2, 3}" };
  if (f.type === "pairs") return f.dimension === 3
    ? { en: "Enter each triple in the order shown, for example (1, 2, 3). Separate multiple triples with semicolons.", ru: "Введите тройку в указанном порядке, например (1, 2, 3). Несколько троек разделяйте точкой с запятой.", placeholder: "(1, 2, 3)" }
    : isCoordinateField(f)
      ? { en: "Enter a point as (1, 2) or x = 1, y = 2. Separate complete pairs with commas or semicolons.", ru: "Введите точку как (1, 2) или x = 1, y = 2. Пары можно разделять запятыми или точками с запятой.", placeholder: "(1, 2), (3, 4)" }
      : { en: "Enter each pair in the order shown. Separate complete pairs with commas or semicolons.", ru: "Введите каждую пару в указанном порядке. Несколько пар можно разделить запятыми или точками с запятой.", placeholder: "(1, 2), (3, 4)" };
  if (f.type === "factors") return { en: "Enter both linear factors, separated by a semicolon: x-1 ; x+2.", ru: "Введите оба линейных множителя через точку с запятой: x-1 ; x+2.", placeholder: "x-1 ; x+2" };
  if (f.type === "ratio") return {
    en: "Enter a single fraction such as (2x+1)/(x−3). You can also separate the numerator and denominator with a semicolon.",
    ru: "Введите одну дробь, например (2x+1)/(x−3). Можно ввести числитель и знаменатель через точку с запятой.",
    placeholder: "(2x+1)/(x−3)",
  };
  if (f.type === "equation") {
    const circle = f.key === "circle" || /\bcircle\b/i.test(f.label);
    const line = f.key === "line" || /\b(?:line|perpendicular|parallel|bisector|tangent|normal)\b/i.test(f.label);
    const placeholder = circle ? "(x−1)^2+(y+2)^2=9" : line ? "y=2x−3 or 2x−y=3" : "x^2=3x+1 or x^2-3x-1";
    return { en: "Enter both sides of the equation or give an expression equal to zero. Use ^ for powers and / for fractions.",
      ru: "Введите уравнение или выражение, равное нулю. Для степеней используйте ^, для дробей /.", placeholder };
  }
  if (f.type === "set") {
    const outputs = rangeOutputs(f);
    if (outputs) return {
      en: "Give the output range as an inequality or an interval. For example, y ≤ 4 is (−∞, 4]. You can type <= for ≤.",
      ru: "Область значений можно записать неравенством или интервалом. Например, y ≤ 4 означает (−∞, 4]. Можно ввести <= вместо ≤.",
      placeholder: "y ≤ 4 or (−∞, 4]",
    };
    if (isIntervalField(f)) {
      const variable = setSymbol(f) ?? "x";
      return {
        en: "Use inequalities in " + variable + " or interval notation. Join intervals with ‘or’ or ∪. Enter an isolated value on its own.",
        ru: "Запишите неравенство для " + variable + " или интервал. Объединяйте промежутки словом or или знаком ∪. Изолированное значение укажите отдельно.",
        placeholder: variable + " < 1 or " + variable + " ≥ 4",
      };
    }
    if (/(?:^|_)roots?$/.test(f.key)) return { en: "Give every root, for example x = 1 or x = 4, or 1, 4. Use sqrt(...) for exact roots, or empty if there are none.", ru: "Укажите все корни, например x = 1 or x = 4 или 1, 4. Для точных корней используйте sqrt(...), если корней нет — empty.", placeholder: "x = 1 or x = 4" };
    return { en: "Give the complete set: {1, 4} for separate values, (1, 5] for an interval, U for union or empty for no real solutions. Use sqrt(...) for exact roots.", ru: "Укажите всё множество: {1, 4} для отдельных значений, (1, 5] для интервала, U для объединения, empty, если действительных решений нет. Точные корни: sqrt(...).", placeholder: "{root1, root2} or (lower, upper]" };
  }
  const symbol = scalarLabels(f)[0];
  if (f.type === "polynomial" && symbol?.endsWith("(x)")) return {
    en: "Enter the expression on its own or write " + symbol + " = … . Use ^ for powers and / to type fractions.",
    ru: "Введите выражение отдельно или с обозначением " + symbol + " = … . Для степеней используйте ^, для дробей /.",
    placeholder: symbol + " = …",
  };
  if (f.variables?.length) return { en: `Enter an expression in ${f.variables.join(", ")}; use ^ for powers and / for fractions.`, ru: `Введите выражение с ${f.variables.join(", ")}; степени обозначайте ^, дроби — /.`, placeholder: `Expression in ${f.variables.join(", ")}` };
  if (symbol) return {
    en: "Enter the value on its own or write " + symbol + " = … . Fractions and exact square roots are accepted.",
    ru: "Введите значение отдельно или с обозначением " + symbol + " = … . Можно использовать дроби и точные корни.",
    placeholder: symbol + " = …",
  };
  return { en: "Enter an exact number, for example 3/2 or 2-sqrt(3).", ru: "Введите точное число, например 3/2 или 2-sqrt(3).", placeholder: "Exact number or fraction" };
}
