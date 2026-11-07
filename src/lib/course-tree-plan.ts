// Pure navigation plan: source content and existing lesson associations are immutable.
export type TreeInput = {
 courses:{id:string;slug:string;title:string;chapters:{id:string;title:string;lessons:{id:string;title:string;position:number;taskIds:string[]}[]}[]}[];
 packages:{courseSlug:string;chapterId:string;chapterTitle:string;lessons:{id:string;title:string}[];links:{uid:string;taskId:string;lessonId:string}[]}[];
 archiveTaskIds:string[];
 approvals:{sourceLessonId:string;approvedLessonId:string|null}[];
};
export const treeName=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/[’']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const unallocatedId=(chapterId:string)=>'archive_unallocated_'+chapterId;
export const unallocatedChapter=(lessonId:string)=>lessonId.startsWith('archive_unallocated_')?lessonId.slice('archive_unallocated_'.length):null;
export function buildCourseTreePlan(input:TreeInput){
 const archive=new Set(input.archiveTaskIds),chapters: {sourceTopicId:string;canonicalTopicId:string|null;reason:string}[]=[],lessons:{sourceLessonId:string;sourceTopicId:string;proposedLessonId:string|null;approvedLessonId:string|null;proposalReason:string}[]=[],placements:{courseId:string;taskId:string;sourceTopicId:string;sourceLessonId:string;targetTopicId:string;targetLessonId:string|null;method:'PROVENANCE'|'APPROVED_MAP'|'UNALLOCATED'|'LEGACY';adaptationUids:string[]}[]=[];
 for(const course of input.courses){
  const packs=input.packages.filter(p=>p.courseSlug===course.slug);if(!packs.length)continue;
  const canonical=new Set(packs.map(p=>p.chapterId)),legacy=course.chapters.filter(ch=>!canonical.has(ch.id));
  const sourceLessons=legacy.flatMap(ch=>ch.lessons.map(l=>({...l,chapterId:ch.id})));
  const links=packs.flatMap(p=>p.links.map(l=>({...l,chapterId:p.chapterId})));
  const available=new Set(course.chapters.flatMap(ch=>ch.lessons.map(l=>l.id)));
  for(const ch of legacy){
   const candidates=packs.filter(p=>treeName(p.chapterTitle)===treeName(ch.title));
   if(candidates.length>1)throw Error('AMBIGUOUS_CANONICAL_CHAPTER');
   const target=candidates[0];
   chapters.push({sourceTopicId:ch.id,canonicalTopicId:target?.chapterId??null,reason:target?'Unique chapter title in installed content packages':'No replacement chapter installed'});
   for(const l of ch.lessons){
    const targets=target?.lessons??[],counts=targets.map(t=>({...t,count:new Set(links.filter(p=>l.taskIds.includes(p.taskId)&&p.lessonId===t.id).map(p=>p.taskId)).size})).sort((a,b)=>b.count-a.count);
    const words=treeName(l.title).split(' ').filter(w=>w.length>3),semantic=targets.map(t=>({...t,score:words.filter(w=>treeName(t.title).includes(w.replace(/s$/,''))).length})).sort((a,b)=>b.score-a.score);
    const proposed=counts[0]?.count?counts[0]:semantic[0]?.score?semantic[0]:null;
    const approved=input.approvals.find(a=>a.sourceLessonId===l.id)?.approvedLessonId??null;
    if(approved&&!targets.some(t=>t.id===approved))throw Error('APPROVAL_OUTSIDE_CANONICAL_CHAPTER');
    lessons.push({sourceLessonId:l.id,sourceTopicId:ch.id,proposedLessonId:proposed?.id??null,approvedLessonId:approved,proposalReason:counts[0]?.count?'Proposal from the largest exact provenance group; not an approval':proposed?'Proposal from lesson concepts; owner approval required':'No unambiguous proposal; owner decision required'});
   }
  }
  const taskIds=[...new Set(sourceLessons.flatMap(l=>l.taskIds).filter(id=>archive.has(id)))].sort();
  for(const taskId of taskIds){
   const sources=sourceLessons.filter(l=>l.taskIds.includes(taskId)).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id));
   const exact=links.filter(l=>l.taskId===taskId),destinations=[...new Set(exact.map(l=>l.lessonId))];
   if(destinations.length>1)throw Error('CONFLICTING_PROVENANCE_PLACEMENT');
   const source=sources[0],ch=chapters.find(c=>c.sourceTopicId===source.chapterId)!,approval=lessons.find(l=>l.sourceLessonId===source.id)?.approvedLessonId;
   if(!source||!ch)throw Error('ARCHIVE_TASK_WITHOUT_SOURCE');
   const target=exact[0];if(target&&!available.has(target.lessonId))throw Error('CANONICAL_LESSON_NOT_INSTALLED');
   placements.push({courseId:course.id,taskId,sourceTopicId:source.chapterId,sourceLessonId:source.id,
    targetTopicId:target?.chapterId??ch.canonicalTopicId??source.chapterId,
    targetLessonId:target?.lessonId??approval??(ch.canonicalTopicId?null:source.id),
    method:target?'PROVENANCE':approval?'APPROVED_MAP':ch.canonicalTopicId?'UNALLOCATED':'LEGACY',
    adaptationUids:[...new Set(exact.map(l=>l.uid))].sort()});
  }
 }
 return {chapters:chapters.sort((a,b)=>a.sourceTopicId.localeCompare(b.sourceTopicId)),lessons:lessons.sort((a,b)=>a.sourceLessonId.localeCompare(b.sourceLessonId)),placements:placements.sort((a,b)=>a.courseId.localeCompare(b.courseId)||a.taskId.localeCompare(b.taskId))};
}
