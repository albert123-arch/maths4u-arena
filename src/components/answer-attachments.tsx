"use client";
import { useEffect, useState } from "react";
import { api, ApiError, ErrorNotice, useLocale } from "./ui";
import { FileViewer, type ViewFile } from "./file-viewer";

function uploadWithProgress(form: FormData, progress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest(); request.open("POST", "/api/files"); request.withCredentials = true; request.timeout = 60000;
    request.upload.onprogress = e => { if (e.lengthComputable) progress(Math.round(e.loaded / e.total * 100)); };
    request.onerror = request.ontimeout = () => reject(new ApiError("UPLOAD_CONNECTION_FAILED", 0));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) { resolve(); return; }
      let code = "SERVICE_UNAVAILABLE"; try { code = JSON.parse(request.responseText).error ?? code; } catch {}
      reject(new ApiError(code, request.status));
    };
    request.send(form);
  });
}
export function AnswerAttachments({ files, attemptId, partId, readOnly, mutate }: { files: ViewFile[]; attemptId: string; partId: string; readOnly: boolean; mutate: (operation: () => Promise<unknown>) => Promise<void> }) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<File | null>(null), [localUrl, setLocalUrl] = useState<string | null>(null), [replace, setReplace] = useState("");
  const [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false), [progress, setProgress] = useState(0);
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);
  function selectFile(file: File | null) { setSelected(file); setLocalUrl(file ? URL.createObjectURL(file) : null); }
  async function act(operation: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await mutate(operation); selectFile(null); setReplace(""); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }
  async function reduce() {
    if (!selected) return;
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(selected, { imageOrientation: "from-image" });
      const ratio = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(), "image/jpeg", .95));
      selectFile(new File([blob], selected.name.replace(/\.[^.]+$/, "") + "-copy.jpg", { type: "image/jpeg" })); setError(null);
    } catch { setError(new ApiError("INVALID_IMAGE", 415)); } finally { setBusy(false); }
  }
  return <div className="answer-attachments"><FileViewer key={files.map(f => f.id).join()} files={files} />
    {!readOnly && <><p className="muted upload-limits">{t("PNG, JPEG или PDF · 8 МиБ на файл · 5 файлов на часть · 250 МиБ на аккаунт. Новые фото: до 40 Мп по умолчанию.", "PNG, JPEG or PDF · 8 MiB per file · 5 files per part · 250 MiB per account. New photos: 40 MP by default.")} <strong>{files.length} / 5</strong></p>
      <div className="stack">{files.map((f, i) => <div key={f.id} className="row spread"><span className="filename">{i + 1}. {f.originalName}</span><div className="row"><button className="secondary" disabled={busy} onClick={() => setReplace(f.id)}>{replace === f.id ? t("Выберите новый файл ниже", "Choose a replacement below") : t("Заменить", "Replace")}</button><button className="secondary" disabled={busy} onClick={() => void act(() => api(`files/${f.id}?attemptId=${attemptId}`, "DELETE"))}>{t("Удалить", "Delete")}</button></div></div>)}</div>
      <label>{replace ? t("Новый файл взамен выбранного", "Replacement file") : t("Добавить фото / PDF", "Add photo / PDF")}<input type="file" accept=".png,.jpg,.jpeg,.pdf" disabled={busy || (!replace && files.length >= 5)} onChange={e => {
        const f = e.target.files?.[0]; if (!f) return; selectFile(f); setError(f.size > 8 * 1024 * 1024 ? new ApiError("FILE_TOO_LARGE", 413) : null); e.target.value = "";
      }} /></label>
      {selected && <div className="upload-preview"><h3>{t("Перед отправкой", "Before uploading")}</h3><p className="filename">{selected.name} · {(selected.size / 1024 / 1024).toFixed(2)} {t("МиБ", "MiB")}</p>
        {localUrl && <FileViewer key={localUrl} files={[{ id: "local", originalName: selected.name, mimeType: selected.type, localUrl }]} />}
        {selected.type.startsWith("image/") && <button className="secondary" disabled={busy} onClick={() => void reduce()}>{t("Подготовить уменьшенную копию (до 2560 px)", "Prepare a smaller copy (up to 2560 px)")}</button>}
        <div className="row"><button disabled={busy || selected.size > 8 * 1024 * 1024} onClick={() => { setProgress(0); void act(() => { const form = new FormData(); form.set("file", selected); form.set("attemptId", attemptId); form.set("partId", partId); if (replace) form.set("replaceId", replace); return uploadWithProgress(form, setProgress); }); }}>{t("Отправить файл", "Upload file")}</button><button className="secondary" disabled={busy} onClick={() => { selectFile(null); setReplace(""); }}>{t("Отмена", "Cancel")}</button></div>
      </div>}
      {busy && <div role="status"><progress max={100} value={progress} /> {progress}% · {progress === 100 ? t("Проверка и сохранение…", "Validating and saving…") : t("Загрузка…", "Uploading…")}</div>}
      <ErrorNotice error={error} /></>}
  </div>;
}
