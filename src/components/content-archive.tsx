"use client";
import { useState } from "react";
import { Button, Input, Select } from "./controls";
import { api, ActionButton, ErrorNotice, Field, Form, Loading, MathContent, str, useLocale, useResource } from "./ui";
import { CatalogQuestionLearning } from "./catalog-question-learning";
import type { CatalogDto } from "@/lib/catalog";
import type { archiveOverview } from "@/lib/content-archive";
import { origins } from "@/lib/content-origin";

export function ContentArchive() {
  const {t,lang}=useLocale(),[origin,setOrigin]=useState<string>("CAMBRIDGE_EXAM"),[archive,setArchive]=useState("1"),[page,setPage]=useState(1),[query,setQuery]=useState("");
  const overview=useResource<Awaited<ReturnType<typeof archiveOverview>>>("admin/content"),r=useResource<CatalogDto>(`catalog?origin=${origin}&archive=${archive}&page=${page}&q=${encodeURIComponent(query)}`);
  const refresh=()=>{r.refresh();overview.refresh();};
  return <div className="stack"><section className="card"><h2>{t("Источники и архив", "Content sources & archive")}</h2><p>{t("Архивные материалы доступны только администратору. Восстановление не меняет версии и ответы.","Archived material is available only to administrators. Restoring it does not change versions or answers.")}</p><div className="row">{overview.data?.counts.map(c=><span className="badge" key={c.origin}>{c.origin}: {c.count}</span>)}</div><div className="field-grid"><label>{t("Происхождение", "Origin")}<Select value={origin} onChange={e=>{setOrigin(e.target.value);setPage(1);}}><option value="">{t("Все", "All")}</option>{origins.map(o=><option value={o} key={o}>{o}</option>)}</Select></label><label>{t("Архив", "Archive")}<Select value={archive} onChange={e=>{setArchive(e.target.value);setPage(1);}}><option value="">{t("Любое состояние", "Any state")}</option><option value="1">{t("В архиве", "Archived")}</option><option value="0">{t("Активные", "Active")}</option></Select></label><label>{t("Название задачи", "Question title")}<Input value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} /></label></div></section>
    <ErrorNotice error={r.error||overview.error}/>{!r.data?<Loading/>:<><p>{r.data.total} {t("задач", "questions")}</p>{r.data.items.map(q=><article className="card archive-task" key={q.id}><div className="row spread"><h2>{q.version.title}</h2>{q.examArchivedAt&&<span className="badge gold">{t("Архив · Cambridge", "Archived · Cambridge")}</span>}</div><p className="muted">{q.origin} · {q.id}{q.originManual?" · manual":""}</p><p>{q.originReason}</p><MathContent html={q.version.statement}/><CatalogQuestionLearning task={q} changed={refresh}/>
      <details><summary>{t("Классификация владельца", "Owner classification")}</summary><Form label={t("Сохранить ручную отметку", "Save manual classification")} done={refresh} submit={f=>api(`admin/content/${q.id}`,"PATCH",{origin:str(f,"origin"),reason:str(f,"reason")})}><label>{t("Происхождение", "Origin")}<Select name="origin" defaultValue={q.origin}>{origins.map(o=><option key={o} value={o}>{o}</option>)}</Select></label><Field name="reason" label={t("Причина", "Reason")}/></Form></details>
      {q.examArchivedAt?<ActionButton secondary label={t("Вернуть из архива", "Restore from archive")} action={()=>api(`admin/content/${q.id}`,"PATCH",{archive:false,reason:lang==="ru"?"Решение владельца: восстановить доступ":"Owner decision: restore access"})} onDone={refresh}/>:q.origin==="CAMBRIDGE_EXAM"?<ActionButton secondary label={t("Архивировать", "Archive")} action={()=>api(`admin/content/${q.id}`,"PATCH",{archive:true,reason:"Owner decision: archive examination material"})} onDone={refresh}/>:null}
    </article>)}<nav className="row"><Button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>{t("Назад", "Previous")}</Button><span>{r.data.page} / {r.data.pages}</span><Button disabled={page>=r.data.pages} onClick={()=>setPage(p=>p+1)}>{t("Далее", "Next")}</Button></nav></>}
  </div>;
}
