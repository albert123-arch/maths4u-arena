import type { Prisma } from "../generated/prisma/client";
import { versionInclude, type Version } from "./content";
import { cleanAuthoredMarkup, cleanAuthoredTitle } from "./content-text-cleanup";
const omit=(row:object,keys:string[])=>Object.fromEntries(Object.entries(row).filter(([k])=>!keys.includes(k)));
const locales=<T extends {locale:string}>(rows:T[])=>[...rows].sort((a,b)=>a.locale.localeCompare(b.locale));
export function versionContent(v:Version,clean=false) {
  return {...omit(v,["id","number","createdAt","parts","texts","assets","task","source"]),
    texts:locales(v.texts).map(t=>({...omit(t,["versionId"]),title:clean?cleanAuthoredTitle(t.title):t.title,statement:clean?cleanAuthoredMarkup(t.statement):t.statement})),
    assets:v.assets.map(a=>omit(a,["id","versionId","file"])),
    parts:v.parts.map(p=>({...omit(p,["id","versionId","texts","options","acceptedAnswers"]),texts:locales(p.texts).map(t=>omit(t,["partId"])),acceptedAnswers:p.acceptedAnswers.map(a=>a.value).sort(),options:p.options.map(o=>({...omit(o,["id","partId","texts"]),texts:locales(o.texts).map(t=>omit(t,["optionId"]))}))}))};
}
export async function appendTaskRevision(tx:Prisma.TransactionClient,v:Version,clean:boolean,id?:string) {
  const latest=await tx.taskVersion.aggregate({where:{taskId:v.taskId},_max:{number:true}});
  const content=versionContent(v,clean);
  const {texts,assets,parts,...scalars}=content;
  const created=await tx.taskVersion.create({data:{...scalars,...(id?{id}:{}),number:latest._max.number!+1,
    texts:{create:texts},assets:{create:assets},parts:{create:parts.map(p=>{const {texts,acceptedAnswers,options,...fields}=p;return {...fields,texts:{create:texts},acceptedAnswers:{create:acceptedAnswers.map(value=>({value}))},options:{create:options.map(o=>{const {texts,...f}=o;return {...f,texts:{create:texts}};})}};})}
  } as Prisma.TaskVersionUncheckedCreateInput,include:versionInclude});
  if(JSON.stringify(versionContent(created))!==JSON.stringify(content))throw Error("NON_TEXT_CHANGE");
  return created;
}
export async function appendLessonRevision(tx:Prisma.TransactionClient,id:string,clean:boolean,newId?:string) {
  const v=await tx.lessonVersion.findUniqueOrThrow({where:{id},include:{texts:true}});
  const latest=await tx.lessonVersion.aggregate({where:{lessonId:v.lessonId},_max:{number:true}});
  const texts=v.texts.map(t=>({...omit(t,["versionId"]),title:clean?cleanAuthoredTitle(t.title):t.title,body:clean?cleanAuthoredMarkup(t.body):t.body}));
  return tx.lessonVersion.create({data:{...(newId?{id:newId}:{}),lessonId:v.lessonId,number:latest._max.number!+1,texts:{create:texts}} as Prisma.LessonVersionUncheckedCreateInput,include:{texts:true}});
}
