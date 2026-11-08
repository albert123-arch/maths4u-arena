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
import fp2Hyperbolic from "../../content/original/9231-fp2/hyperbolic-v1.json";
import fp2Matrices2 from "../../content/original/9231-fp2/matrices2-v1.0.1.json";
import mechanicsVariable from "../../content/original/9231-mechanics/variable-v1.json";
import mechanicsMomentum from "../../content/original/9231-mechanics/momentum-v1.json";
import mechanicsHooke from "../../content/original/9231-mechanics/hooke-v1.json";
import mechanicsCircular from "../../content/original/9231-mechanics/circular-v1.json";
import mechanicsEquilibrium from "../../content/original/9231-mechanics/equilibrium-v1.json";
import mechanicsProjectiles from "../../content/original/9231-mechanics/projectiles-v1.json";
import fp2Ode from "../../content/original/9231-fp2/ode-v1.json";
import fp2Complex from "../../content/original/9231-fp2/complex-v1.json";
import fp2Integration from "../../content/original/9231-fp2/integration-v1.json";
import fp2Differentiation from "../../content/original/9231-fp2/differentiation-v1.json";
import polar from "../../content/original/9231-fp1/polar-v1.json";
import matrices1 from "../../content/original/9231-fp1/matrices1-v1.json";
import p1Quadratics from "../../content/original/9709-p1/quadratics-v1.json";
import p1Functions from "../../content/original/9709-p1/functions-v1.json";
import p1CoordinateGeometry from "../../content/original/9709-p1/coordinate-geometry-v1.json";
import p1CircularMeasure from "../../content/original/9709-p1/circular-measure-v1.json";
import p1Trigonometry from "../../content/original/9709-p1/trigonometry-v1.json";
import p1Series from "../../content/original/9709-p1/series-v1.json";
import p1BinomialExpansion from "../../content/original/9709-p1/binomial-expansion-v1.json";
import p1Differentiation from "../../content/original/9709-p1/differentiation-v1.json";
import p1Integration from "../../content/original/9709-p1/integration-v1.json";
import s1Representation from "../../content/original/9709-s1/representation-v1.json";
import s1CentralTendency from "../../content/original/9709-s1/central-tendency-v1.json";
import s1Variation from "../../content/original/9709-s1/variation-v1.json";
import { contentPackageSchema, type ContentPackage } from "./content-package-schema";
import { notationProgressPolicy } from "./content-progress-policy";
import type { QuadraticTopic } from "./square-model";
export const contentPackages: ContentPackage[] = [contentPackageSchema.parse(roots),contentPackageSchema.parse(rational),contentPackageSchema.parse(summation),contentPackageSchema.parse(matrices1),contentPackageSchema.parse(polar),contentPackageSchema.parse(vectors),contentPackageSchema.parse(induction),contentPackageSchema.parse(statsCrv),contentPackageSchema.parse(statsInference),contentPackageSchema.parse(statsChi2),contentPackageSchema.parse(statsNonparam),contentPackageSchema.parse(statsPgf),contentPackageSchema.parse(fp2Hyperbolic),contentPackageSchema.parse(fp2Matrices2),contentPackageSchema.parse(fp2Differentiation),contentPackageSchema.parse(fp2Integration),contentPackageSchema.parse(fp2Complex),contentPackageSchema.parse(fp2Ode),contentPackageSchema.parse(mechanicsProjectiles),contentPackageSchema.parse(mechanicsEquilibrium),contentPackageSchema.parse(mechanicsCircular),contentPackageSchema.parse(mechanicsHooke),contentPackageSchema.parse(mechanicsVariable),contentPackageSchema.parse(mechanicsMomentum),contentPackageSchema.parse(p1Quadratics),contentPackageSchema.parse(p1Functions),contentPackageSchema.parse(p1CoordinateGeometry),contentPackageSchema.parse(p1CircularMeasure),contentPackageSchema.parse(p1Trigonometry),contentPackageSchema.parse(p1Series),contentPackageSchema.parse(p1BinomialExpansion),contentPackageSchema.parse(p1Differentiation),contentPackageSchema.parse(p1Integration),contentPackageSchema.parse(s1Representation),contentPackageSchema.parse(s1CentralTendency),contentPackageSchema.parse(s1Variation)];
export function contentPackage(key:string) {
  const p=contentPackages.find(p=>p.key===key);if(!p)throw Error("UNKNOWN_CONTENT_PACKAGE");return p;
}
export function packageTopic(key:string):QuadraticTopic|undefined {
  for(const p of contentPackages){const l=p.lessons.find(l=>l.id===key);if(l)return {key:l.id,code:l.key,lessonId:l.id,
    title:l.title,summary:l.summary,version:p.version,sourceProject:"arena-package-"+p.key,
    storage:"maths4u.package."+l.id,api:"learning/packages/"+l.id,
    path:"/courses/"+p.course.slug+"/topics/"+l.id,packageKey:p.key,compatibleVersions:notationProgressPolicy(p).map(r=>r.fromVersion)};}
}
export function packageQuestions(key:string) {
  const t=packageTopic(key);if(!t)return undefined;
  const p=contentPackage(t.packageKey!),l=p.lessons.find(l=>l.id===key)!;
  return p.questions.filter(q=>q.lesson===l.key).map(q=>({id:q.id,family_uid:q.family_uid,title:q.title,collection:q.collection,prompt_html:q.prompt_html,
    answer_html:q.answer_html,solution_html:q.solution_html,hint_html:q.hint_html,marks:q.marks,difficulty:q.difficulty,fields:q.fields,parts:q.parts,...(q.variant_index!==undefined?{variant_index:q.variant_index}:{})}));
}
export function packageTeaching(topic:QuadraticTopic) {
  if(!topic.packageKey)return undefined;
  const p=contentPackage(topic.packageKey),l=p.lessons.find(l=>l.id===topic.lessonId)!;
  return {notes:'<h2>Objective</h2><p>'+l.objective+'</p><h3>Before you start</h3>'+l.before+'<h2>Key ideas</h2>'+l.ideas+'<h2>Method</h2>'+l.method+'<h3>Common mistakes</h3><ul>'+l.mistakes.map(m=>'<li>'+m+'</li>').join('')+'</ul>',
    examples:l.examples,
    navigation:{directionPath:"/learn/"+p.course.direction,directionTitle:p.course.direction==="further"?"Further Mathematics":"AS & A Level",coursePath:"/courses/"+p.course.slug,courseTitle:p.course.title,
      chapterTitle:p.chapter.title,chapterPath:p.course.direction==="further"?"/courses/"+p.course.slug+"/chapters/"+p.chapter.slug:"/courses/"+p.course.slug+"?chapter="+p.chapter.id,topics:p.lessons.map(l=>({key:l.id,title:l.title,path:"/courses/"+p.course.slug+"/topics/"+l.id}))}};
}
