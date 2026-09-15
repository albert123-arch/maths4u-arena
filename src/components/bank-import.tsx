"use client";
import { useRef, useState } from "react";
import type { BankManifest, BankAsset } from "@/lib/bank-schema";
import type { checkBankTasks, checkBankStructure } from "@/lib/bank-import";
import { api, ErrorNotice, useLocale } from "./ui";
import { bankUploadQueue } from "@/lib/bank-upload-queue";

type Plan=Awaited<ReturnType<typeof checkBankTasks>>;
async function sha(value:string|ArrayBuffer) {const bytes=typeof value==="string"?new TextEncoder().encode(value):value;return [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(n=>n.toString(16).padStart(2,"0")).join("");}
function base64(bytes:Uint8Array){let text="";for(const byte of bytes)text+=String.fromCharCode(byte);return btoa(text);}
export function BankImport() {
  const {t}=useLocale(),[files,setFiles]=useState<File[]>([]),[publishNew,setPublishNew]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState(""),[error,setError]=useState<unknown>(null),[plans,setPlans]=useState<Record<string,Plan>>({}),[runId,setRunId]=useState("");
  const structures=useRef<Record<string,Awaited<ReturnType<typeof checkBankStructure>>>>({});
  const stop=useRef(false),manifestRef=useRef<BankManifest|null>(null);
  const file=(name:string)=>{const matches=files.filter(f=>f.webkitRelativePath.endsWith("/"+name)||f.name===name);if(matches.length!==1)throw new Error("BANK_PACKAGE_FILE");return matches[0];};
  const payload=async(key:string)=>{const f=file("batches/"+key+".json");if(f.size>512*1024)throw new Error("BANK_BATCH_SIZE");const text=await f.text();if(await sha(text)!==manifestRef.current!.batches.find(b=>b.key===key)!.sha256)throw new Error("BANK_BATCH_HASH");return JSON.parse(text);};
  async function perform(action:()=>Promise<void>) {setBusy(true);setError(null);stop.current=false;try{await action();}catch(e){setError(e);}finally{setBusy(false);}}
  async function prepare() {
    const source=file("manifest.json");if(source.size>1024*1024)throw new Error("BANK_MANIFEST_SIZE");const manifest=JSON.parse(await source.text()) as BankManifest;manifestRef.current=manifest;
    const started=await api<{runId:string;missingBatches:string[]}>("admin/bank/start","POST",{manifest,publishNew});setRunId(started.runId);
    let done=0;for(const key of started.missingBatches){if(stop.current)return;setStatus(t("Проверка пакетов: ","Checking batches: ")+(++done)+" / "+started.missingBatches.length);
      const encoded=base64(new TextEncoder().encode(JSON.stringify(await payload(key))));
      await api("admin/bank/stage","POST",{runId:started.runId,key,payloadBase64:encoded});}
    structures.current={};for(const b of manifest.batches.filter(b=>b.kind==="structure")){if(stop.current)return;structures.current[b.key]=await api("admin/bank/structure/check","POST",{runId:started.runId,key:b.key});}
    const next:Record<string,Plan>={};for(const b of manifest.batches.filter(b=>b.kind==="tasks")){if(stop.current)return;next[b.key]=await api<Plan>("admin/bank/check","POST",{runId:started.runId,key:b.key});setStatus(t("Dry-run: проверено задач ","Dry run: tasks checked ")+Object.values(next).reduce((n,p)=>n+p.items.length,0));}
    setPlans(next);setStatus(t("Проверка завершена. Изменения учебных материалов ещё не применены.","Check complete. Learning materials have not been changed yet."));
  }
  async function apply() {
    const manifest=manifestRef.current!;let uploaded=0;
    for(const b of manifest.batches.filter(b=>b.kind==="assets")) {
      if(stop.current)return;const p=await payload(b.key) as BankAsset[],checked=await api<{missing:string[]}>("admin/bank/files/check","POST",{runId,key:b.key});
      const completed=await bankUploadQueue(p,async a=>{if(checked.missing.includes(a.id)){const f=file(a.file);if(f.size!==a.size)throw new Error("BANK_FILE_SIZE");const bytes=await f.arrayBuffer();if(await sha(bytes)!==a.sha256)throw new Error("BANK_FILE_HASH");await api("admin/bank/files","POST",{runId,key:b.key,id:a.id,base64:base64(new Uint8Array(bytes))});}setStatus(t("Файлы: ","Files: ")+(++uploaded)+" / "+manifest.files);},()=>stop.current);
      if(!completed)return;
    }
    for(const b of manifest.batches.filter(b=>b.kind==="structure")){if(stop.current)return;await api("admin/bank/structure","POST",{runId,key:b.key});}
    let done=0;for(const b of manifest.batches.filter(b=>b.kind==="tasks")){if(stop.current)return;await api("admin/bank/apply","POST",{runId,key:b.key,fingerprint:plans[b.key].fingerprint});done+=b.count;setStatus(t("Задачи: ","Tasks: ")+done+" / "+manifest.tasks);}
    setPlans({});setStatus(t("Импорт завершён. Повторите dry-run: ожидаются только неизменившиеся задачи.","Import complete. Repeat the dry run: all tasks should be unchanged."));
  }
  const totals=Object.values(plans).reduce((s,p)=>({created:s.created+p.created,updated:s.updated+p.updated,skipped:s.skipped+p.skipped}),{created:0,updated:0,skipped:0});
  return <section className="card" style={{marginBottom:24}}><h2>{t("Перенос пяти курсов 0606 / 9231", "0606 / 9231 course transfer")}</h2><p className="muted">{t("Распакуйте пакет и выберите папку publish. Сначала проверьте отчёт. Повторная загрузка продолжает прерванный импорт; существующие права и назначения сохраняются.","Unzip the package and select its publish folder. Review the report first. Repeating a transfer resumes it and preserves existing access and assignments.")}</p>
    <label>{t("Папка пакета", "Package folder")}<input type="file" multiple {...{webkitdirectory:""}} disabled={busy} onChange={e=>{setFiles([...e.target.files??[]]);setPlans({});setRunId("");}}/></label>
    <label className="check"><input type="checkbox" checked={publishNew} disabled={busy} onChange={e=>{setPublishNew(e.target.checked);setPlans({});setRunId("");}}/>{t("Открыть новые материалы, опубликованные в источнике. Видимость существующих материалов сохраняется.","Publish new materials that are public in the source. Keep existing material visibility.")}</label>
    <div className="row" style={{marginTop:16}}><button disabled={busy||!files.length} onClick={()=>void perform(prepare)}>{t("Проверить / продолжить (dry-run)","Check / resume (dry run)")}</button>{Object.keys(plans).length>0&&<button disabled={busy} onClick={()=>void perform(apply)}>{t("Применить проверенный импорт", "Apply reviewed import")}</button>}{busy&&<button className="secondary" onClick={()=>{stop.current=true;setStatus(t("Остановка после текущего запроса. Можно продолжить.","Stopping after this request. You can resume later."));}}>{t("Приостановить", "Pause")}</button>}</div>
    {!!Object.keys(plans).length&&<><p>{t("Новых", "New")}: {totals.created} · {t("Новых версий", "New versions")}: {totals.updated} · {t("Без изменений", "Unchanged")}: {totals.skipped}</p><button className="secondary" onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({runId,structures:structures.current,plans},null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="maths4u-bank-dry-run.json";a.click();URL.revokeObjectURL(url);}}>{t("Скачать подробный dry-run", "Download detailed dry run")}</button></>}
    <p role="status">{status}</p><ErrorNotice error={error}/>
  </section>;
}
