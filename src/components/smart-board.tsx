"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PresentationsDto } from "@/lib/presentations";
import { ErrorNotice, Loading, useLocale, useResource } from "./ui";

export function SmartBoard({ lessonId, presentationId }: { lessonId: string; presentationId?: string }) {
  const { t } = useLocale(), resource = useResource<PresentationsDto>(`teaching/topics/${lessonId}/presentations`);
  if (resource.error) return <ErrorNotice error={resource.error} />;
  if (!resource.data) return <Loading />;
  const data = resource.data, back = `/courses/${data.courseSlug}/topics/${lessonId}`;
  if (!data.items.length || presentationId && !data.items.some(p => p.id === presentationId)) return <section className="card"><h1>{t("Презентация недоступна", "Presentation unavailable")}</h1><p>{t("Возможно, ссылка была удалена. Выберите другую презентацию в теме.", "The link may have been removed. Choose another presentation in the topic.")}</p><Link href={back}>← {t("К теме", "Back to topic")}</Link></section>;
  return <BoardPlayer key={lessonId + ":" + presentationId} data={data} initialId={presentationId ?? data.items[0].id} back={back} />;
}

function BoardPlayer({ data, initialId, back }: { data: PresentationsDto; initialId: string; back: string }) {
  const { t } = useLocale(), root = useRef<HTMLDivElement>(null), toolbar = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState(initialId), [blank, setBlank] = useState(false), [controls, setControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false), [fullscreenError, setFullscreenError] = useState(false);
  const [frameError, setFrameError] = useState(false);
  const index = data.items.findIndex(p => p.id === selected), item = data.items[index] ?? data.items[0];
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setControls(true); setBlank(false); } };
    document.addEventListener("fullscreenchange", change); document.addEventListener("keydown", escape);
    const old = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; document.removeEventListener("fullscreenchange", change); document.removeEventListener("keydown", escape); };
  }, []);
  function select(id: string) { setSelected(id); setFrameError(false); }
  async function toggleFullscreen() {
    setFullscreenError(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else setFullscreenError(true);
    } catch { setFullscreenError(true); }
  }
  return <div className="smart-board" ref={root} aria-label={t("Режим смарт-борда", "Smart board mode")}>
    <header className="board-toolbar" hidden={!controls}>
      <div className="row spread"><Link className="button secondary" href={back}>← {t("К теме", "Back to topic")}</Link><div className="board-title"><span>{data.title}</span><h1>{item.title}</h1></div>
        <div className="row"><button className="secondary" onClick={() => setBlank(v => !v)} aria-pressed={blank}>{blank ? t("Показать экран", "Show screen") : t("Скрыть экран", "Blank screen")}</button><button className="secondary" onClick={() => void toggleFullscreen()}>{fullscreen ? t("Выйти из полного экрана", "Exit fullscreen") : t("Полный экран", "Fullscreen")}</button><a className="button secondary" href={item.openUrl} target="_blank" rel="noopener noreferrer">Google ↗</a><button ref={toolbar} onClick={() => setControls(false)}>{t("Убрать панель", "Hide toolbar")}</button></div></div>
      {data.items.length > 1 && <nav className="board-playlist" aria-label={t("Презентации урока", "Lesson presentations")}><button className="secondary" disabled={index <= 0} onClick={() => select(data.items[index - 1].id)} aria-label={t("Предыдущая презентация", "Previous presentation")}>←</button><label>{t("Презентация", "Presentation")}<select value={item.id} onChange={e => select(e.target.value)}>{data.items.map((p, i) => <option key={p.id} value={p.id}>{i + 1}. {p.title}</option>)}</select></label><span>{index + 1} / {data.items.length}</span><button className="secondary" disabled={index >= data.items.length - 1} onClick={() => select(data.items[index + 1].id)} aria-label={t("Следующая презентация", "Next presentation")}>→</button></nav>}
      <details className="board-help"><summary>{t("Не видно слайды?", "Cannot see the slides?")}</summary><p>{t("Проверьте доступ к файлу в Google. При запросе входа откройте Google ↗ и войдите в нужный Google-аккаунт. Браузер может ограничивать вход внутри встроенного просмотра. Слайды переключаются кнопками самой презентации; панель Arena выбирает презентации темы.", "Check Google file access. If sign-in is required, open Google ↗ and sign in to the correct account. The browser may restrict sign-in inside an embedded viewer. Use the presentation’s controls to change slides; the Arena toolbar selects presentations in this topic.")}</p></details>
    </header>
    {!controls && <button className="board-restore" onClick={() => { setControls(true); requestAnimationFrame(() => toolbar.current?.focus()); }}>{t("Панель урока", "Lesson toolbar")}</button>}
    {fullscreenError && <p className="board-notice" role="status">{t("Браузер не разрешил полный экран. Режим доски уже занимает окно; можно использовать F11 или открыть Google ↗.", "The browser did not allow fullscreen. Board mode fills the window; try F11 or open Google ↗.")}</p>}
    <div className="board-stage">
      <iframe key={item.embedUrl} src={item.embedUrl} title={t("Презентация: ", "Presentation: ") + item.title} allow="fullscreen" allowFullScreen referrerPolicy="no-referrer" hidden={blank} onError={() => setFrameError(true)} />
      {blank && <button className="board-blank" onClick={() => setBlank(false)}><span aria-hidden="true">◉</span>{t("Экран скрыт", "Screen is blank")}<small>{t("Нажмите, чтобы продолжить урок", "Tap to continue the lesson")}</small></button>}
      {frameError && !blank && <div className="board-frame-error" role="alert"><p>{t("Встроенный просмотр не загрузился.", "The embedded viewer did not load.")}</p><a className="button" href={item.openUrl} target="_blank" rel="noopener noreferrer">{t("Открыть в Google", "Open in Google")} ↗</a></div>}
    </div>
  </div>;
}
