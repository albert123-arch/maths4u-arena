import test from "node:test";import assert from "node:assert/strict";import {readFile} from "node:fs/promises";
import {nextReview,validReview,withReviewHelp,reviewQueue,type ReviewState} from "../src/lib/pure1-review-policy.mjs";
test("review intervals, no same-day inflation, weak recovery and deterministic priority",async()=>{
 const cases=JSON.parse(await readFile("tests/pure1-review-policy-cases.json","utf8")) as {name:string;events:{at:number;correct:boolean;helpUsed:boolean}[];expected:ReviewState}[];
 for(const c of cases){let s:ReviewState|undefined;for(const e of c.events)s=nextReview(s,e);assert.deepEqual(s,c.expected,c.name);assert.ok(validReview(s));}
 assert.equal(validReview({correct:true}),false);assert.equal(validReview({...cases[0].expected,dueAt:NaN}),false);
 const helped=withReviewHelp(cases[5].expected)!;assert.equal(helped.streak,0);assert.equal(helped.dueAt,helped.checkedAt+86400000);
 const items=[{uid:"q1",block:"b",skill:"s",title:"One skill",href:"/numeric",notesHref:"/notes"},{uid:"q2",block:"b",skill:"s",title:"One skill",href:"/choice",notesHref:"/notes"},{uid:"q3",block:"b",skill:"other",title:"Other",href:"/other",notesHref:"/notes"}];
 const states={q1:nextReview(null,{at:100,correct:true,helpUsed:false}),q2:nextReview(null,{at:200,correct:false,helpUsed:false}),q3:nextReview(null,{at:100,correct:true,helpUsed:false})};
 const q=reviewQueue(items,states,300);assert.equal(q.length,2);assert.equal(q[0].href,"/choice");assert.equal(q[0].attempted,2);assert.equal(q[0].due,1);assert.equal(q[0].failed,1);assert.equal(reviewQueue(items,{},300).length,0);
 const recovered=nextReview(states.q2,{at:400,correct:true,helpUsed:false});assert.equal(reviewQueue(items,{q2:recovered},500)[0].weak,1);
 const consolidated=nextReview(recovered,{at:recovered.dueAt,correct:true,helpUsed:false});assert.equal(reviewQueue(items,{q2:consolidated},consolidated.checkedAt)[0].weak,0);
 assert.equal(reviewQueue(items,{q1:states.q1},states.q1.dueAt)[0].due,1);
});
