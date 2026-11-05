"use client";
import type { ReactNode } from "react";
import { useLocale } from "./ui";
export type FeedbackKind = "correct" | "again" | "hint" | "format";
export function Feedback({ kind, children, compact = false, id }: { kind: FeedbackKind; children?: ReactNode; compact?: boolean; id?: string }) {
  const { t } = useLocale();
  const labels = { correct: t("Верно", "Correct"), again: t("Попробуйте ещё", "Look again"), hint: t("Подсказка", "Hint"), format: t("Проверьте формат", "Check the format") };
  const icons = { correct: "✓", again: "↻", hint: "?", format: "!" };
  return <div id={id} className={`feedback feedback--${kind}${compact ? " feedback--compact" : ""}`} role={compact ? undefined : "status"}><span className="feedback-icon" aria-hidden="true">{icons[kind]}</span><div><strong>{labels[kind]}</strong>{children && <div className="feedback-body">{children}</div>}</div></div>;
}
