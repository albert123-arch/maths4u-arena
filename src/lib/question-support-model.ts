export type SupportKind = "hint" | "solution" | "guidance";
export type SupportAccess = "attempt" | "stuck" | "paper";
export type MarkingRow = { id: string; part: string; code: string; marks: number; html: string; guidance?: string };
export type SupportContent = { html?: string; rows?: MarkingRow[]; total?: number; assets?: { id: string; mimeType: string; caption: string; accessToken?:string; embedded?:boolean }[] };
export function markingTotal(rows: MarkingRow[]) { return rows.reduce((sum, r) => sum + r.marks, 0); }
export function selfMarkTotal(rows: MarkingRow[], values: Record<string, number>) { return rows.reduce((n, r) => n + Math.max(0, Math.min(r.marks, Number.isInteger(values[r.id]) ? values[r.id] : 0)), 0); }
export function markingCodes(rows: MarkingRow[]) { return [...new Set(rows.flatMap(r => r.code.match(/\b(?:B|M|A)(?=\d|\b)|\bFT\b/g) ?? []))]; }
