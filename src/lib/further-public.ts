import {cache} from 'react';
import {db} from './prisma';
import {contentPackages} from './content-package-content';
import {visibleLessonWhere} from './content-access';
export const furtherPublic=cache(async()=>{
 const installed=await db().contentPackage.findMany({where:{state:'PUBLISHED'}});
 const packs=contentPackages.filter(p=>p.course.direction==='further'&&installed.some(s=>s.key===p.key));
 const lessons=await db().lesson.findMany({where:{id:{in:packs.flatMap(p=>p.lessons.map(l=>l.id))},archivedAt:null,...visibleLessonWhere(null),topic:{course:{published:true,archivedAt:null,featureKey:null}}},select:{id:true,versions:{take:1,orderBy:{number:'desc'},select:{createdAt:true}}}});
 return packs.map(p=>{const state=installed.find(s=>s.key===p.key)!;const available=p.lessons.filter(l=>lessons.some(r=>r.id===l.id));
  const modified=new Date(Math.max(state.publishedAt?.getTime()??0,...available.map(l=>lessons.find(r=>r.id===l.id)?.versions[0]?.createdAt.getTime()??0)));
  return {key:p.key,courseSlug:p.course.slug,courseTitle:p.course.title,chapterId:p.chapter.id,chapterTitle:p.chapter.title,chapterPath:'/courses/'+p.course.slug+'/chapters/'+p.chapter.slug,modified:modified.toISOString(),lessons:available.map(l=>({id:l.id,title:l.title,objective:l.objective,path:'/courses/'+p.course.slug+'/topics/'+l.id,modified:new Date(Math.max(state.publishedAt?.getTime()??0,lessons.find(r=>r.id===l.id)?.versions[0]?.createdAt.getTime()??0)).toISOString()}))};
 }).filter(p=>p.lessons.length);
});
export type FurtherChapter=Awaited<ReturnType<typeof furtherPublic>>[number];
export const furtherCourseName=(title:string)=>title.replace(/\s*\(9231\)/,'').replace('Pure Mathematics','Pure').replace('Probability & Statistics','Statistics');
export function furtherMetadata(ch:FurtherChapter,lesson?:FurtherChapter['lessons'][number]){
 const course=furtherCourseName(ch.courseTitle),focus=lesson?.title.split(/,| and /)[0].replace(/\s+$/,'');
 return {title:(lesson?ch.chapterTitle+': '+focus+' — ':ch.chapterTitle+' — ')+'9231 '+course+' notes & practice | Maths4U',description:lesson?lesson.objective+' Worked examples, quick checks and exam-style practice with solutions.':'Study '+ch.chapterTitle+' for 9231 '+course+'. Explore '+ch.lessons.length+' lessons with notes, worked examples, quick checks and exam-style questions.'};
}
export function learningStructuredData(ch:FurtherChapter,lesson?:FurtherChapter['lessons'][number]){
 const origin='https://arena.maths4u.sbs',path=lesson?.path??ch.chapterPath,metadata=furtherMetadata(ch,lesson),crumbs=[{name:'Maths4U',path:'/'},{name:'9231 '+furtherCourseName(ch.courseTitle),path:'/courses/'+ch.courseSlug},{name:ch.chapterTitle,path:ch.chapterPath},...(lesson?[{name:lesson.title,path:lesson.path}]:[])];
 return [{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,name:c.name,item:origin+c.path}))},{'@context':'https://schema.org','@type':['WebPage','LearningResource'],name:lesson?.title??ch.chapterTitle,url:origin+path,description:metadata.description,inLanguage:'en',isAccessibleForFree:true,educationalLevel:'A Level Further Mathematics',learningResourceType:['Notes','Worked examples','Practice questions'],about:'Cambridge International 9231 '+ch.chapterTitle,...(lesson?{teaches:lesson.objective}:{}),dateModified:lesson?.modified??ch.modified,publisher:{'@type':'Organization',name:'Maths4U',url:origin}}] as const;
}
export const safeJsonLd=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');
