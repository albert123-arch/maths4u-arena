"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "./controls";
import { api, ErrorNotice, Loading, useResource, useLocale } from "./ui";
import { SquareLessonView } from "./square-lesson";
import type { SquareLesson } from "@/lib/square-model";
import type { contentPackageStatus, planContentPackage } from "@/lib/content-packages";
export function ContentPackages({selected}:{selected?:string}){
  const {t}=useLocale(),r=useResource<Awaited<ReturnType<typeof contentPackageStatus>>>("admin/content-packages");
  const [preview,setPreview]=useState<Awaited<ReturnType<typeof planContentPackage>>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null);
  async function act(fn:()=>Promise<unknown>){setBusy(true);setError(null);try{await fn();r.refresh();}catch(e){setError(e);}finally{setBusy(false);}}
  return <><h1>{t("Пакеты содержания","Content packages")}</h1><ErrorNotice error={r.error||error}/>{!r.data?<Loading/>:r.data.filter(p=>!selected||p.key===selected).map(p=><section className="card stack" key={p.key}>
    <div><h2>{p.title}</h2><p>{p.course} · {p.version}</p><span className="badge">{p.state==="PUBLISHED"?t("Опубликовано","Published"):p.state==="ARCHIVED"?t("Архив","Archived"):t("Не опубликовано","Unpublished")}</span></div>
    <p>{p.lessons.length} {t("урока","lessons")} · {p.exam} exam-style · {p.questions-p.exam} {t("коротких проверок","quick checks")}</p>
    <ol>{p.lessons.map(l=><li key={l.id}><Link href={"/admin/content-packages/"+p.key+"/preview/"+l.id}>{l.title} →</Link></li>)}</ol>
    <div className="row"><Button disabled={busy} onClick={()=>void act(async()=>setPreview(await api("admin/content-packages/"+p.key+"/dry-run","POST")))}>{t("Пробный запуск","Dry run")}</Button>
      {preview?.key===p.key&&<Button disabled={busy||preview.state==="ALREADY_APPLIED"} onClick={()=>void act(async()=>{await api("admin/content-packages/"+p.key+"/apply","POST",{token:preview.token});setPreview(null);})}>{t("Применить пакет","Apply package")}</Button>}</div>
    {preview?.key===p.key&&<p role="status">{preview.state} · {t("создать","create")}: {preview.create} · {t("новые версии","new versions")}: {preview.update} · {t("пропустить","skip")}: {preview.skip}</p>}
    {p.state!=="NOT_INSTALLED"&&<div className="row">
      <Button disabled={busy||p.state!=="DRAFT"} onClick={()=>void act(()=>api("admin/content-packages/"+p.key+"/state","POST",{action:"publish",fingerprint:p.fingerprint}))}>{t("Опубликовать главу","Publish chapter")}</Button>
      <Button variant="outline" disabled={busy||p.state==="ARCHIVED"} onClick={()=>void act(()=>api("admin/content-packages/"+p.key+"/state","POST",{action:"archive",fingerprint:p.fingerprint}))}>{t("Архивировать пакет","Archive package")}</Button>
      <Button variant="text" disabled={busy||p.state!=="ARCHIVED"} onClick={()=>void act(()=>api("admin/content-packages/"+p.key+"/state","POST",{action:"restore",fingerprint:p.fingerprint}))}>{t("Восстановить черновик","Restore draft")}</Button></div>}
    <details><summary>{t("Служебное сопоставление источников · только администратору","Source mappings · administrator only")}</summary><p>{p.sourceLinks.length} {t("связей с сохранённым архивом. Это справочные данные, не вывод об авторстве.","links to the preserved archive. Reference data, not an authorship determination.")}</p>{p.sourceLinks.map(s=><p key={s.uid}>{s.uid} → {s.original_id}</p>)}</details>
  </section>)}</>;
}
export function ContentPackagePreview({packageKey,lessonId}:{packageKey:string;lessonId:string}){
  const r=useResource<SquareLesson>("admin/content-packages/"+packageKey+"/lessons/"+lessonId);
  if(r.error)return <ErrorNotice error={r.error}/>;
  return r.data?<SquareLessonView lesson={r.data} sessionReady/>:<Loading/>;
}
