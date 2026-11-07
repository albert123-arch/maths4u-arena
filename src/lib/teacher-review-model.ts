export type ReviewDraftValue = { points: string; comment: string; revision: number };
export function reviewQuestionScore(parts: { id: string; maxPoints: number }[], values: Record<string, ReviewDraftValue>) {
  let total=0,complete=true,invalid=false;
  for(const p of parts){const raw=values[p.id]?.points.trim()??'';if(!raw){complete=false;continue;}const n=Number(raw);if(!Number.isFinite(n)||n<0||n>p.maxPoints){invalid=true;complete=false;}else total+=n;}
  return { points:Math.round(total*1e6)/1e6, maximum:Math.round(parts.reduce((n,p)=>n+p.maxPoints,0)*1e6)/1e6, complete, invalid };
}
export function restoreReviewDraft(raw: string | null, signature: string, allowedIds: string[]) {
  if(!raw)return null;
  try{const stored=JSON.parse(raw)as{signature?:unknown;values?:Record<string,ReviewDraftValue>;dirty?:unknown;flags?:unknown};
    if(stored.signature!==signature||!stored.values||!Array.isArray(stored.dirty))return null;
    const values:Record<string,ReviewDraftValue>={};for(const id of allowedIds){const d=stored.values[id];if(!d)continue;if(typeof d.points!=='string'||d.points.length>100||typeof d.comment!=='string'||d.comment.length>10000||!Number.isInteger(d.revision)||d.revision<0)return null;values[id]={points:d.points,comment:d.comment,revision:d.revision};}
    return {values,dirty:stored.dirty.filter((id):id is string=>typeof id==='string'&&allowedIds.includes(id)),flags:Array.isArray(stored.flags)?stored.flags.filter((id):id is string=>typeof id==='string'):[]};
  }catch{return null;}
}
export function distinctReviewGuidance(entries: (string | undefined)[]) {
  const seen:string[]=[];return entries.filter((html):html is string=>{if(!html)return false;const text=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,'');if(!text||seen.some(previous=>previous.includes(text)))return false;seen.push(text);return true;});
}
