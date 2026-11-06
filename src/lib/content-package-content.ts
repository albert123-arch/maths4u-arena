// Server-only registry: never import package JSON from a client component.
import roots from "../../content/original/9231-fp1/roots-v1.json";
import rational from "../../content/original/9231-fp1/rational-v1.json";
import summation from "../../content/original/9231-fp1/summation-v1.json";
import vectors from "../../content/original/9231-fp1/vectors-v1.json";
import induction from "../../content/original/9231-fp1/induction-v1.json";
import statsCrv from "../../content/original/9231-statistics/crv-v1.json";
import statsInference from "../../content/original/9231-statistics/inference-v1.json";
import statsChi2 from "../../content/original/9231-statistics/chi2-v1.0.1.json";
import statsNonparam from "../../content/original/9231-statistics/nonparam-v1.json";
import statsPgf from "../../content/original/9231-statistics/pgf-v1.json";
import polar from "../../content/original/9231-fp1/polar-v1.json";
import matrices1 from "../../content/original/9231-fp1/matrices1-v1.json";
import { contentPackageSchema, type ContentPackage } from "./content-package-schema";
import type { QuadraticTopic } from "./square-model";
export const contentPackages: ContentPackage[] = [contentPackageSchema.parse(roots),contentPackageSchema.parse(rational),contentPackageSchema.parse(summation),contentPackageSchema.parse(matrices1),contentPackageSchema.parse(polar),contentPackageSchema.parse(vectors),contentPackageSchema.parse(induction),contentPackageSchema.parse(statsCrv),contentPackageSchema.parse(statsInference),contentPackageSchema.parse(statsChi2),contentPackageSchema.parse(statsNonparam),contentPackageSchema.parse(statsPgf)];
export function contentPackage(key:string) {
  const p=contentPackages.find(p=>p.key===key);if(!p)throw Error("UNKNOWN_CONTENT_PACKAGE");return p;
}
export function packageTopic(key:string):QuadraticTopic|undefined {
  for(const p of contentPackages){const l=p.lessons.find(l=>l.id===key);if(l)return {key:l.id,code:l.key,lessonId:l.id,
    title:l.title,summary:l.summary,version:p.version,sourceProject:"arena-package-"+p.key,
    storage:"maths4u.package."+l.id,api:"learning/packages/"+l.id,
    path:"/courses/"+p.course.slug+"/topics/"+l.id,packageKey:p.key};}
}
export function packageQuestions(key:string) {
  const t=packageTopic(key);if(!t)return undefined;
  const p=contentPackage(t.packageKey!),l=p.lessons.find(l=>l.id===key)!;
  return p.questions.filter(q=>q.lesson===l.key).map(q=>({id:q.id,family_uid:q.family_uid,title:q.title,collection:q.collection,prompt_html:q.prompt_html,
    answer_html:q.answer_html,solution_html:q.solution_html,hint_html:q.hint_html,marks:q.marks,difficulty:q.difficulty,fields:q.fields,parts:q.parts}));
}
export function packageTeaching(topic:QuadraticTopic) {
  if(!topic.packageKey)return undefined;
  const p=contentPackage(topic.packageKey),l=p.lessons.find(l=>l.id===topic.lessonId)!;
  return {notes:'<h2>Objective</h2><p>'+l.objective+'</p><h3>Before you start</h3>'+l.before+'<h2>Key ideas</h2>'+l.ideas+'<h2>Method</h2>'+l.method+'<h3>Common mistakes</h3><ul>'+l.mistakes.map(m=>'<li>'+m+'</li>').join('')+'</ul>',
    examples:l.examples,
    navigation:{directionPath:"/learn/"+p.course.direction,directionTitle:"Further Mathematics",coursePath:"/courses/"+p.course.slug,courseTitle:p.course.title,
      chapterTitle:p.chapter.title,topics:p.lessons.map(l=>({key:l.id,title:l.title,path:"/courses/"+p.course.slug+"/topics/"+l.id}))}};
}
