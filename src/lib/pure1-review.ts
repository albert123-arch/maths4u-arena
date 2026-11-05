import {db} from "./prisma";
import {type Actor} from "./security";
import {taskPermission} from "./catalog";
import {hasFeature} from "./subscriptions";
import {allPure1Questions,pure1Family} from "./pure1-variants";
import {originalLessonId,originalBlocks} from "./original-blocks";
import {nextReview,reviewQueue,familyReviewItems,type ReviewState,type ReviewItem} from "./pure1-review-policy.mjs";

const questions=new Map(allPure1Questions.map(q=>[q.uid,q]));
export async function pure1Review(actor:Actor,now=Date.now()){
 const studies=await db().practiceStudy.findMany({where:{selfDirected:false,attempt:{userId:actor.id,status:"GRADED",workVersion:{work:{kind:"PRACTICE",ownerId:actor.id,classId:null,round:{is:null}},items:{some:{taskVersion:{sourceUid:{in:[...questions.keys()]}}}}}}},include:{attempt:{select:{id:true,submittedAt:true,answers:{select:{partId:true,autoPoints:true}},workVersion:{select:{items:{select:{taskVersion:{select:{id:true,taskId:true,sourceUid:true,parts:{select:{id:true,kind:true,maxPoints:true}}}}}}}}}}}});
 const studiedFamilies=new Set(studies.flatMap(s=>{const q=questions.get(s.attempt.workVersion.items[0]?.taskVersion.sourceUid??"");return q?[pure1Family(q)]:[];})),pool=allPure1Questions.filter(q=>studiedFamilies.has(pure1Family(q)));
 const tasks=pool.length?await db().task.findMany({where:{AND:[await taskPermission(actor),{visibility:"PUBLIC",versions:{some:{sourceUid:{in:pool.map(q=>q.uid)}}}}]},include:{versions:{orderBy:{number:"desc"},take:1,select:{id:true,sourceUid:true,number:true}},lessons:{include:{lesson:{include:{topic:{include:{course:true}}}}}}}}):[];
 const allowed=new Map<string,(typeof tasks)[number]>(),states:Record<string,ReviewState>={},seen:Record<string,{checkedAt:number}>={},items:ReviewItem[]=[];
 const permissions=new Map<string,boolean>();
 for(const t of tasks){
  const v=t.versions[0],q=questions.get(v?.sourceUid??"");if(!q||v.number!==1)continue;
  const key=("maths4u-original-"+q.block) as keyof typeof originalBlocks,id=originalLessonId(key,q.skill),link=t.lessons.find(l=>l.lessonId===id),course=link?.lesson.topic.course;
  if(!link||link.lesson.archivedAt||!course||course.archivedAt||!course.published||course.id!=="orig_9709_p1")continue;
  if(!permissions.has(course.id))permissions.set(course.id,!course.featureKey||await hasFeature(actor,course.featureKey));
  if(!permissions.get(course.id))continue;
  allowed.set(t.id,t);
  const base="/courses/maths4u-9709-p1/topics/"+id;
  items.push({uid:q.uid,family_uid:pure1Family(q),block:q.block,skill:q.skill,title:q.title.replace(/: (?:check|review variant) \d+$/,""),href:base+"?mode="+(q.kind==="CHOICE"?"MC":"SHORT")+"&reviewTask="+t.id+"#question-"+t.id,notesHref:base});
 }
 studies.sort((a,b)=>(a.attempt.submittedAt?.getTime()??0)-(b.attempt.submittedAt?.getTime()??0)||a.attempt.id.localeCompare(b.attempt.id));
 for(const s of studies){const v=s.attempt.workVersion.items[0]?.taskVersion,t=allowed.get(s.taskId),q=questions.get(v?.sourceUid??"");if(!v||!t||!q||s.attempt.workVersion.items.length!==1||t.versions[0]?.id!==v.id||!s.attempt.submittedAt||v.parts.length!==1||v.parts.some(p=>p.kind!=="NUMERIC"&&p.kind!=="CHOICE"))continue;
  const part=v.parts[0],answer=s.attempt.answers.find(a=>a.partId===part.id);if(answer?.autoPoints==null||!Number.isFinite(answer.autoPoints))continue;
  const at=s.attempt.submittedAt.getTime(),family=pure1Family(q);seen[q.uid]={checkedAt:at};states[family]=nextReview(states[family],{at,correct:answer.autoPoints===part.maxPoints,helpUsed:!!(s.hintAt||s.answerAt||s.solutionAt||s.markSchemeAt)});
 }
 const queue=reviewQueue(familyReviewItems(items,seen),states,now);
 return {dueSkills:queue.filter(g=>g.due>0).length,reviewedSkills:queue.length,skills:queue.slice(0,4)};
}
export type Pure1ReviewDto=Awaited<ReturnType<typeof pure1Review>>;
