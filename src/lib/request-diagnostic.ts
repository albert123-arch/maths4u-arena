// Only fixed categories and machine codes may leave an exception. Never return
// messages, SQL, parameter values, connection details, or stack traces.
const names = new Set(["Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError", "PrismaClientKnownRequestError", "PrismaClientUnknownRequestError", "PrismaClientValidationError", "DriverAdapterError"]);
const systemCodes = new Set(["EACCES", "EPERM", "ENOENT", "ENOSPC", "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND", "ERR_REQUIRE_ESM"]);
const hints: Array<[RegExp, string]> = [
  [/illegal mix of collations/i, "DB_COLLATION"], [/incorrect string value/i, "DB_ENCODING"],
  [/max_allowed_packet|packet.*too large/i, "DB_PACKET_LIMIT"], [/access denied|command denied/i, "DB_ACCESS"],
  [/invalid json|json_valid/i, "DB_JSON"], [/not a function/i, "JS_NOT_CALLABLE"],
  [/cannot read properties|cannot read property/i, "JS_PROPERTY"], [/unknown column/i, "DB_COLUMN"],
];
const collations = ["utf8mb4_unicode_ci", "utf8mb4_general_ci", "utf8mb4_uca1400_ai_ci", "utf8mb4_0900_ai_ci", "utf8mb4_bin", "utf8mb3_general_ci", "utf8mb3_unicode_ci", "latin1_swedish_ci"];
export class BankStageError extends Error {
  constructor(public stage: "manifest" | "schema" | "html" | "write", cause: unknown) { super("Bank staging failed", { cause }); }
}
export function requestDiagnostic(error: unknown): string {
  const tokens = new Set<string>(), seen = new Set<object>();
  if (error instanceof BankStageError) tokens.add("bank.stage." + error.stage);
  function visit(value: unknown, depth: number) {
    if (!value || typeof value !== "object" || depth > 5 || seen.has(value)) return;
    seen.add(value);
    const e = value as Record<string, unknown>;
    if (typeof e.name === "string" && names.has(e.name)) tokens.add(e.name);
    for (const key of ["code", "originalCode", "errno", "sqlState"]) {
      const code = e[key];
      if (typeof code === "string" && (/^P\d{4}$/.test(code) || systemCodes.has(code))) tokens.add(code);
      if ((typeof code === "number" && Number.isInteger(code) || typeof code === "string" && /^\d{4}$/.test(code)) && Number(code) >= 1000 && Number(code) <= 9999) tokens.add("DB_" + code);
    }
    for (const key of ["message", "originalMessage"]) if (typeof e[key] === "string") {
      for (const [pattern, hint] of hints) if (pattern.test(e[key])) tokens.add(hint);
      if (/illegal mix of collations/i.test(e[key])) for (const collation of collations) if (e[key].includes(collation)) tokens.add(collation);
    }
    for (const key of ["cause", "meta", "driverAdapterError"]) visit(e[key], depth + 1);
  }
  visit(error, 0);
  return [...tokens].join(" / ") || "UNCLASSIFIED";
}
