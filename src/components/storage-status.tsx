"use client";
import { useState } from "react";
import type { auditStorage } from "@/lib/storage-maintenance";
import { ActionButton, api, ErrorNotice, useLocale } from "./ui";
export function StorageStatus() {
  const {t}=useLocale(),[report,setReport]=useState<Awaited<ReturnType<typeof auditStorage>>|null>(null),[error,setError]=useState<unknown>(null);
  return <section className="card"><h2>{t("Приватные файлы", "Private files")}</h2><p>{t("Проверка учитывает оригиналы и производные файлы отдельно. Очистка затрагивает только вложения, уже удалённые владельцами до сдачи.", "Audit tracks originals and derivatives separately. Cleanup only retries deletion of attachments already removed by their owners before submission.")}</p>
    <ActionButton secondary label={t("Проверить занятое место", "Audit storage usage")} action={async()=>{try{setReport(await api("admin/storage"));setError(null);}catch(e){setError(e);}}}/>
    <ErrorNotice error={error}/>{report && <><dl>{Object.entries({[t("Квота оригиналов", "Original quota")]:report.originalQuotaBytes,[t("Оригиналы на диске", "Originals on disk")]:report.originalDiskBytes,[t("Превью и миниатюры", "Previews and thumbnails")]:report.derivativeDiskBytes,[t("Ожидают очистки", "Awaiting cleanup")]:report.pendingCleanupBytes}).map(([label,bytes])=><div key={label}><dt>{label}</dt><dd>{(bytes/1024/1024).toFixed(2)} MiB</dd></div>)}</dl><p>{t("Отсутствующих активных файлов: ", "Missing active files: ")}{report.missingActiveFiles}</p>
      {report.pendingCleanupBytes>0 && <ActionButton secondary label={t("Повторить очистку удалённых вложений", "Retry deleted attachment cleanup")} action={async()=>setReport(await api("admin/storage/retry-deleted","POST",{}))}/>}</>}
  </section>;
}
