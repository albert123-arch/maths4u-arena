"use client";
import { useState } from "react";
import type { checkPilotCorrection } from "@/lib/pilot-correction";
import { api, ErrorNotice, useLocale } from "./ui";

export function PilotCorrection() {
  const { t } = useLocale();
  const [input, setInput] = useState<unknown>(null), [report, setReport] = useState<Awaited<ReturnType<typeof checkPilotCorrection>> | null>(null);
  const [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  return <section className="card" style={{ marginBottom: 24 }}><h2>{t("Исправление пилота: MS и решения", "Pilot correction: MS and solutions")}</h2>
    <p className="muted">{t("Создаёт новые версии 36 задач и отделяет примеры olymp от теории. Задачи, файлы и снимки выданных работ сохраняются. Сначала проверьте dry-run.", "Creates new versions of 36 tasks and separates olymp examples from theory. Task IDs, files and assigned work snapshots are preserved. Review the dry run first.")}</p>
    <label>{t("Проверенный correction.json", "Verified correction.json")}<input type="file" accept=".json" disabled={busy} onChange={async e => {
      const file = e.target.files?.[0]; if (!file) return; setBusy(true); setReport(null); setDone(false); setError(null);
      try { if (file.size > 2 * 1024 * 1024) throw new Error(); const data = JSON.parse(await file.text()); setInput(data); setReport(await api("admin/import/pilot/correction/check", "POST", data)); } catch (e) { setError(e); } finally { setBusy(false); }
    }} /></label><ErrorNotice error={error} />
    {report && <><p>{t("Новых версий задач: ", "New task versions: ")}{report.updatedTasks}. {t("Новых файлов: 0. Выданные работы: без изменений.", "New files: 0. Assigned works: unchanged.")}</p>
      <details><summary>{t("Перечень dry-run", "Dry-run records")}</summary><ol>{report.tasks.map(r => <li key={r.taskId}>{r.project}:{r.legacyId} · {r.action} · v{r.nextVersion}</li>)}</ol></details>
      <button disabled={busy || done} onClick={async () => { setBusy(true); setError(null); try { await api("admin/import/pilot/correction/apply", "POST", { correction: input, fingerprint: report.fingerprint }); setDone(true); setReport(await api("admin/import/pilot/correction/check", "POST", input)); } catch (e) { setError(e); } finally { setBusy(false); } }}>{t("Применить проверенное исправление", "Apply verified correction")}</button>
      {done && <p role="status">{t("Исправление применено. Повторная проверка выше показывает оставшиеся изменения.", "Correction applied. The check above shows any remaining changes.")}</p>}</>}
  </section>;
}
