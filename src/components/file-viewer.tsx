"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useLocale } from "./ui";

export type ViewFile = { id: string; originalName: string; mimeType: string; size?: number; derivatives?: { kind: string }[]; previewError?: string | null; localUrl?: string };
function PdfPage({ url, zoom, rotation }: { url: string; zoom: number; rotation: number }) {
  const { t } = useLocale();
  const canvas = useRef<HTMLCanvasElement>(null), container = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null), [page, setPage] = useState(1), [error, setError] = useState(false);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    let closed = false; let loading: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;
    void import("pdfjs-dist").then(pdf => {
      if (closed) return;
      pdf.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      loading = pdf.getDocument({ url, withCredentials: true, disableAutoFetch: true, disableStream: true, rangeChunkSize: 65536,
        cMapUrl: "/pdfjs/cmaps/", cMapPacked: true, standardFontDataUrl: "/pdfjs/standard_fonts/", wasmUrl: "/pdfjs/wasm/" });
      return loading.promise.then(doc => { if (!closed) setDocument(doc); });
    }).catch(() => { if (!closed) setError(true); });
    return () => { closed = true; void loading?.destroy(); };
  }, [url]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)));
    observer.observe(container.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document) return;
    let closed = false; let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    void document.getPage(page).then(pdfPage => {
      if (closed || !canvas.current) return;
      const base = pdfPage.getViewport({ scale: 1, rotation: (pdfPage.rotate + rotation) % 360 });
      const scale = Math.min(3, width / base.width * zoom);
      const viewport = pdfPage.getViewport({ scale, rotation: (pdfPage.rotate + rotation) % 360 });
      const target = canvas.current;
      target.width = Math.ceil(viewport.width); target.height = Math.ceil(viewport.height);
      render = pdfPage.render({ canvas: target, viewport });
      return render.promise;
    }).catch(() => { if (!closed) setError(true); });
    return () => { closed = true; render?.cancel(); };
  }, [document, page, width, zoom, rotation]);
  return <div ref={container} className="pdf-document">
    {document && <div className="row pdf-pages"><button className="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
      <label>{t("Страница", "Page")} <input aria-label={t("Страница PDF", "PDF page")} type="number" min={1} max={document.numPages} value={page} onChange={e => setPage(Math.min(document.numPages, Math.max(1, Number(e.target.value) || 1)))} /></label>
      <span>/ {document.numPages}</span><button className="secondary" disabled={page === document.numPages} onClick={() => setPage(p => p + 1)}>→</button></div>}
    {error ? <p className="notice">{t("Предпросмотр PDF недоступен. Оригинал можно скачать.", "PDF preview is unavailable. You can download the original.")}</p> : <canvas ref={canvas} aria-label={t("Страница работы ученика", "Student document page")} />}
  </div>;
}
export function FileViewer({ files }: { files: ViewFile[] }) {
  const { t } = useLocale();
  const [selected, setSelected] = useState(() => Math.max(0, files.findIndex(f => f.mimeType.startsWith("image/")))), [zoom, setZoom] = useState(1), [rotation, setRotation] = useState(0), [failed, setFailed] = useState(false);
  const [aspect, setAspect] = useState(1);
  const viewport = useRef<HTMLDivElement>(null), drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const f = files[Math.min(selected, files.length - 1)];
  if (!f) return null;
  const url = f.localUrl ?? "/api/files/" + f.id;
  const preview = f.localUrl ?? (f.derivatives?.some(d => d.kind === "preview") ? url + "?variant=preview" : url);
  function reset() { setZoom(1); setRotation(0); setFailed(false); viewport.current?.scrollTo(0, 0); }
  return <section className="file-viewer" aria-label={t("Просмотр вложений", "Attachment viewer")}>
    <div className="viewer-tools row"><button className="secondary" aria-label={t("Уменьшить", "Zoom out")} disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .5))}>−</button>
      <span>{Math.round(zoom * 100)}%</span><button className="secondary" aria-label={t("Увеличить", "Zoom in")} disabled={zoom >= 4} onClick={() => setZoom(z => Math.min(4, z + .5))}>+</button>
      <button className="secondary" onClick={() => setRotation(r => (r + 90) % 360)}>{t("Повернуть", "Rotate")} ↻</button><button className="secondary" onClick={reset}>{t("Вписать", "Fit")}</button>
      <a href={url} target="_blank" rel="noopener noreferrer">{t("Оригинал", "Original")} ↗</a></div>
    <div className="viewer-viewport" ref={viewport} onPointerDown={e => { if (zoom === 1 || (e.target as HTMLElement).closest("button,input,a")) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, left: e.currentTarget.scrollLeft, top: e.currentTarget.scrollTop }; }}
      onPointerMove={e => { const d = drag.current; if (d) { e.currentTarget.scrollLeft = d.left - e.clientX + d.x; e.currentTarget.scrollTop = d.top - e.clientY + d.y; } }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} style={{ touchAction: zoom > 1 ? "none" : "auto" }}>
      {f.mimeType === "application/pdf" ? <PdfPage key={f.id} url={url} zoom={zoom} rotation={rotation} /> : failed ? <p className="notice">{t("Предпросмотр недоступен. Откройте оригинал.", "Preview unavailable. Open the original.")}</p> :
        <div className="viewer-image-space" style={{ width: `${zoom * 100}%`, aspectRatio: rotation % 180 ? 1 / aspect : aspect, position: "relative" }}>
          {/* Original dimensions vary; authenticated image URLs must bypass image optimizers. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={f.id} src={preview} alt={f.originalName} draggable={false} onError={() => setFailed(true)} onLoad={e => setAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%, -50%) rotate(${rotation}deg)`, maxWidth: "none", width: rotation % 180 ? `${aspect * 100}%` : "100%" }} />
        </div>}
    </div>
    <div className="viewer-thumbnails">{files.map((file, i) => <button key={file.id} className={i === selected ? "selected" : "secondary"} aria-label={`${i + 1}. ${file.originalName}`} aria-pressed={i === selected} onClick={() => { setSelected(i); reset(); }}>
      {file.mimeType.startsWith("image/") && (file.localUrl || file.derivatives?.some(d => d.kind === "thumbnail")) ?
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={file.localUrl ?? `/api/files/${file.id}?variant=thumbnail`} alt="" loading="lazy" /> : <span>{file.mimeType === "application/pdf" ? "PDF" : t("Фото", "Photo")}</span>}<small>{i + 1}</small></button>)}</div>
    <p className="muted viewer-caption">{Math.min(selected + 1, files.length)} / {files.length} · {f.originalName}</p>
    {f.previewError && <p className="notice">{t("Миниатюра не создана; оригинал сохранён.", "Thumbnail unavailable; the original is preserved.")}</p>}
  </section>;
}
