import type { SquareField, SquareQuestion } from "./square-model";

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

export function answerFormat(f: SquareField): { en: string; ru: string; placeholder: string } {
  if (f.type === "choice") return { en: "Choose one option. Explain your reasoning on paper.", ru: "Выберите один вариант. Объясните рассуждение на бумаге.", placeholder: "" };
  if (f.type === "integers") return { en: "List every integer in braces, for example {1, 2, 3}; use empty if there are none.", ru: "Перечислите все целые числа в фигурных скобках, например {1, 2, 3}; если их нет, введите empty.", placeholder: "{1, 2, 3}" };
  if (f.type === "pairs") return f.dimension === 3
    ? { en: "Enter (parameter, x, y); separate multiple triples with semicolons.", ru: "Введите (параметр, x, y); несколько троек разделяйте точкой с запятой.", placeholder: "(parameter, x, y); (…)" }
    : { en: "Enter (x, y); separate multiple pairs with semicolons. Fractions and sqrt(...) are accepted.", ru: "Введите (x, y); несколько пар разделяйте точкой с запятой. Можно использовать дроби и sqrt(...).", placeholder: "(x, y); (x, y)" };
  if (f.type === "factors") return { en: "Enter both linear factors, separated by a semicolon: x-1 ; x+2.", ru: "Введите оба линейных множителя через точку с запятой: x-1 ; x+2.", placeholder: "x-1 ; x+2" };
  if (f.type === "ratio") return { en: "Enter numerator ; denominator, keeping any parameter restrictions in the relevant field.", ru: "Введите числитель ; знаменатель. Ограничения параметра укажите в соответствующем поле.", placeholder: "numerator ; denominator" };
  if (f.type === "equation") return { en: "Enter both sides of the equation, or its polynomial equal to zero. Use ^ for powers and / for fractions.", ru: "Введите обе части уравнения или многочлен, равный нулю. Степени: ^; дроби: /.", placeholder: "x^2=3x+1 or x^2-3x-1" };
  if (f.type === "set") {
    if (/range|domain|allowed|restriction|levels|parameters/.test(f.key)) return { en: "Use intervals such as (1, 5], inf for infinity and U for union. Isolated values use {…}; no values uses empty.", ru: "Используйте интервалы, например (1, 5], inf для бесконечности и U для объединения. Отдельные значения: {…}; нет значений: empty.", placeholder: "(lower, upper] U {value}" };
    return { en: "Give the complete set: {1, 4} for separate values, (1, 5] for an interval, U for union or empty for no real solutions. Use sqrt(...) for exact roots.", ru: "Укажите всё множество: {1, 4} для отдельных значений, (1, 5] для интервала, U для объединения, empty, если действительных решений нет. Точные корни: sqrt(...).", placeholder: "{root1, root2} or (lower, upper]" };
  }
  if (f.variables?.length) return { en: `Enter an expression in ${f.variables.join(", ")}; use ^ for powers and / for fractions.`, ru: `Введите выражение с ${f.variables.join(", ")}; степени обозначайте ^, дроби — /.`, placeholder: `Expression in ${f.variables.join(", ")}` };
  return { en: "Enter an exact number, for example 3/2 or 2-sqrt(3).", ru: "Введите точное число, например 3/2 или 2-sqrt(3).", placeholder: "Exact number or fraction" };
}
