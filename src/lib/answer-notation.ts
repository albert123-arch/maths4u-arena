type Field = { type: string; key: string; label: string };

export function normaliseAnswerLabel(label: string) {
  return label.replace(/[−–]/g, "-").replace(/\s+/g, "")
    .replace(/⁻¹|\^\{-1\}|\^\(-1\)/g, "^-1").toLowerCase();
}

/** The answer symbol can differ from the independent variable in the question. */
export function scalarSymbol(field: Field) {
  if (/^[a-z]$/i.test(field.key)) return field.key;
  if (/^form_[ahk]$/.test(field.key)) return field.key.slice(-1);
  const named = /^(?:value of|coefficient|exceptional|line intercept|parameter) ([a-z])\b/i.exec(field.label);
  if (named) return named[1];
  if (/^(?:linear_root|fixed_root|repeated_root|argmin)$/.test(field.key)) return "x";
  if (field.key === "discriminant") return "D";
  return undefined;
}

export function scalarLabels(field: Field) {
  const labels = [scalarSymbol(field)].filter((label): label is string => !!label);
  if (field.type === "polynomial") {
    const division = /^(?:Quotient (Q\(x\))|Remainder (R\(x\)))$/i.exec(field.label);
    const named = division?.[1] ?? division?.[2];
    return named ? [...new Set([named, named[0], ...labels])] : labels;
  }
  const evaluation = /^(?:Exact )?value of ([a-z]{1,2}(?:⁻¹|\^-1|\^\{-1\})?\([−–+\d./ -]+\))$/i.exec(field.label)?.[1];
  if (evaluation) {
    labels.unshift(evaluation);
    // Inverse evaluation gives the original input, often labelled x in the working.
    if (normaliseAnswerLabel(evaluation).includes("^-1")) labels.push("x");
  }
  const segment = /^(?:Exact )?length ([A-Z]{2})$/i.exec(field.label)?.[1];
  if (segment) labels.push(segment);
  if (field.key === "radius") labels.push("r");
  if (field.key === "area" || /^Area\b/i.test(field.label)) labels.push("area");
  return [...new Set(labels)];
}

export function setSymbol(field: Field) {
  const named = /\b([a-z])[- ]values\b/i.exec(field.label)
    ?? /\b(?:values? of|restriction on|levels?|parameters?|slopes?|set for) ([a-z])\b(?!\s*\()/i.exec(field.label)
    ?? /^All ([a-z])\b(?!\s*\()/i.exec(field.label);
  if (named) return named[1].toLowerCase();
  if (field.key === "levels") return "t";
  if (field.key === "parameters") return "k";
  if (field.key === "u_domain") return "u";
  if (field.key === "width_domain") return "w";
  if (field.key === "h_values") return "h";
  if (/^(?:domain|allowed|solutions|excluded|restriction)$/.test(field.key) || /\bx[- ](?:intercepts|roots|values)/i.test(field.label)) return "x";
  return undefined;
}

export function isIntervalField(field: Field) {
  return /interval|solution set|allowed values/i.test(field.label) ||
    /domain|allowed|restriction|levels|parameters/.test(field.key);
}

export function isCoordinateField(field: Field) {
  const axes = /\(([^()]*,[^()]*)\)/.exec(field.label);
  if (axes) return /^\s*x\s*,\s*y\s*$/i.test(axes[1]);
  return !/\bpolar\b/i.test(field.label) && /\b(?:points?|vertex|coordinates?|intersections?|intercepts?|cartesian|centre)\b/i.test(field.label);
}

/** Only output ranges can be written as inequalities in y or the named function. */
export function rangeOutputs(field: Field, prompt?: string): string[] | undefined {
  if (field.type !== "set") return undefined;
  const named = /^Range of ([a-z])$/i.exec(field.label)?.[1];
  if (field.key !== "range" && !(field.key === "allowed" && named)) return undefined;
  if (/inverse/i.test(field.label)) {
    const inverse = prompt?.match(/\b([a-z])\^\{-1\}/i)?.[1];
    return inverse ? ["y", inverse + "⁻¹(x)"] : ["y"];
  }
  const name = named ?? prompt?.match(/\b([fgh])\(x\)\s*=/)?.[1];
  return name ? ["y", name + "(x)", ...(named && named !== "x" ? [named] : [])] : ["y", "f(x)", "g(x)", "h(x)"];
}
