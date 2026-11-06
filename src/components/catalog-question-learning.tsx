"use client";
import { useContext, useState } from "react";
import { ActorContext, api, useLocale } from "./ui";
import { ButtonLink } from "./controls";
import { QuickPractice } from "./quick-practice";
import { useView } from "./view-state";
import { MaterialPreview } from "./view-preview";
import { QuestionSupport } from "./question-support";
import type { CatalogDto } from "@/lib/catalog";
import type { SupportContent } from "@/lib/question-support-model";
export function CatalogQuestionLearning({task,lessonId,changed}:{task:CatalogDto['items'][number];lessonId?:string;changed:()=>void}) {
  const lens=useView();
  const {t,lang}=useLocale(),actor=useContext(ActorContext),manage=actor?.roles.some(r=>r.role==='TEACHER'||r.role==='ADMIN');
  const [attempted,setAttempted]=useState(!!task.progress&&task.progress.state!=='IN_PROGRESS'),manual=task.mode==='WRITTEN';
  return <div className="catalog-learning">{!manual&&!manage&&(lens?.mode === "ROLE" ? <MaterialPreview kind="tasks" id={task.id} /> : lens ? <p>Read only · open saved answers from the dashboard.</p> : actor?<QuickPractice task={task} lessonId={lessonId} changed={changed} onAttempt={()=>setAttempted(true)}/>:<ButtonLink href="/login">{t('Войти и решать','Sign in to practise')}</ButtonLink>)}
    <QuestionSupport storageKey={'maths4u.support.'+(actor?.id??'guest')+'.'+task.version.id} manual={manual} maximum={task.points} enabled={lens?.mode!=="USER"} attempted={attempted} request={(kind,access)=>api<SupportContent>('catalog/tasks/'+task.id+'/support?lang='+lang,'POST',{kind,...(access?{access}:{}),...(lessonId?{lessonId}:{})})} assess={actor&&!lens&&!task.examArchivedAt?points=>api('catalog/tasks/'+task.id+'/self-assess?lang='+lang,'POST',{points,...(lessonId?{lessonId}:{})}):undefined}/>
  </div>;
}
