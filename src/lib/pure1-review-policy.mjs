export const reviewIntervals = [1,3,7,14];
const day=86400000;
export function validReview(s){return !!s&&typeof s.correct==='boolean'&&typeof s.helpUsed==='boolean'&&typeof s.hadError==='boolean'&&Number.isSafeInteger(s.streak)&&s.streak>=0&&s.streak<=4&&Number.isFinite(s.checkedAt)&&s.checkedAt>=0&&Number.isFinite(s.dueAt)&&s.dueAt>=s.checkedAt;}
export function nextReview(previous,event){
 if(typeof event.correct!=='boolean'||typeof event.helpUsed!=='boolean'||!Number.isFinite(event.at)||event.at<0)throw Error('Invalid review event');
 const old=validReview(previous)?previous:null;
 if(old&&event.at<old.checkedAt)return old;
 const hadError=(old?.hadError??false)||!event.correct;
 let streak=0,dueAt=event.at;
 if(event.correct){
  if(event.helpUsed){streak=0;dueAt=old?.correct&&old.dueAt>event.at?Math.min(old.dueAt,event.at+day):event.at+day;}
  else if(!old||!old.correct||old.streak===0){streak=1;dueAt=old?.correct&&old.dueAt>event.at?Math.min(old.dueAt,event.at+day):event.at+day;}
  else if(event.at>=old.dueAt){streak=Math.min(4,old.streak+1);dueAt=event.at+reviewIntervals[streak-1]*day;}
  else{streak=old.streak;dueAt=old.dueAt;}
 }
 return {checkedAt:event.at,dueAt,streak,correct:event.correct,helpUsed:event.helpUsed,hadError};
}
export function withReviewHelp(s){return !validReview(s)?null:{...s,helpUsed:true,streak:0,dueAt:s.correct?Math.min(s.dueAt,s.checkedAt+day):s.dueAt};}
/** Unseen first, then least recently checked. A refresh alone never changes the choice. */
export function familyReviewItems(items,seen){
 const groups=new Map();for(const q of items){const f=q.family_uid??q.uid;if(!groups.has(f))groups.set(f,[]);groups.get(f).push(q);}
 return [...groups.entries()].map(([family,pool])=>{pool.sort((a,b)=>{
  const x=seen[a.uid]?.checkedAt,y=seen[b.uid]?.checkedAt,ax=Number.isFinite(x),by=Number.isFinite(y);
  return Number(ax)-Number(by)||(ax&&by?x-y:0)||Number(a.uid===family)-Number(b.uid===family)||a.uid.localeCompare(b.uid);
 });return {...pool[0],uid:family,family_uid:family,variant_uid:pool[0].uid};});
}
/** Migrate dated device evidence without replacing any original result or inventing a date. */
export function restoreFamilyReviews(items,states,cached={}){
 const out={};for(const item of familyReviewItems(items,states)){const f=item.family_uid,pool=items.filter(q=>(q.family_uid??q.uid)===f).map(q=>states[q.uid]).filter(validReview).sort((a,b)=>a.checkedAt-b.checkedAt);let s=validReview(cached[f])?cached[f]:null;
  for(const current of pool){if(!s)s=current;else if(current.checkedAt>s.checkedAt){s=nextReview(s,{at:current.checkedAt,correct:current.correct,helpUsed:current.helpUsed});s.hadError=s.hadError||current.hadError;}else if(current.checkedAt===s.checkedAt&&current.helpUsed&&!s.helpUsed)s=withReviewHelp(s);}
  if(s)out[f]=s;
 }return out;
}
export function reviewQueue(items,states,now=Date.now()){
 const groups=new Map();
 for(const q of items){const s=states[q.uid];if(!validReview(s))continue;const key=q.block+':'+q.skill;let g=groups.get(key);if(!g){g={block:q.block,skill:q.skill,title:q.title,href:q.href,notesHref:q.notesHref,attempted:0,due:0,weak:0,failed:0,nextDue:s.dueAt,uids:[],targets:[]};groups.set(key,g);}
  g.targets.push({href:q.href,due:s.dueAt<=now,failed:!s.correct,at:s.dueAt});
  g.attempted++;g.uids.push(q.uid);g.nextDue=Math.min(g.nextDue,s.dueAt);if(s.dueAt<=now)g.due++;if(!s.correct)g.failed++;if(!s.correct||s.helpUsed||(s.hadError&&s.streak<2))g.weak++;
 }
 return [...groups.values()].map(g=>{g.targets.sort((a,b)=>Number(b.due)-Number(a.due)||Number(b.failed)-Number(a.failed)||a.at-b.at);const {targets,...out}=g;return {...out,href:targets[0].href};}).sort((a,b)=>Number(b.due>0)-Number(a.due>0)||b.failed-a.failed||b.weak-a.weak||a.nextDue-b.nextDue||(a.block+':'+a.skill).localeCompare(b.block+':'+b.skill));
}
