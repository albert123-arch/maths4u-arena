import test from 'node:test';
import assert from 'node:assert/strict';
import { quadraticTopics } from '../src/lib/square-model';
import { questionsForTopic, squareMarkingRows, squareHelp, squarePublicLesson } from '../src/lib/square-content';
import { renderContent } from '../src/lib/content';
import { markingTotal, selfMarkTotal, markingCodes } from '../src/lib/question-support-model';

test('all 152 original questions retain their criteria, totals and exact solution without criteria',()=>{
  let count=0;
  for(const topic of quadraticTopics){
    const visible=squarePublicLesson(topic);
    for(const q of questionsForTopic(topic.key)){
      count++;const before=JSON.stringify(q),rows=squareMarkingRows(q);
      assert.equal(markingTotal(rows),q.marks,q.id);assert(rows.length>0,q.id);
      const criteria=q.parts?.length?q.parts.flatMap(p=>p.marking_criteria):q.marking_criteria!;
      assert.equal(rows.length,criteria.length);
      rows.forEach((r,i)=>{assert.equal(r.code,criteria[i].code);assert.equal(r.marks,criteria[i].marks);assert.equal(r.html,renderContent(criteria[i].description_html));assert(!r.html.includes('katex-error'));});
      assert.equal(squareHelp(q,'solution'),renderContent(q.answer_html+q.solution_html));
      assert.equal(JSON.stringify(q),before);assert(!JSON.stringify(visible.questions.find(x=>x.uid===q.id)).includes('description_html'));
    }
  }
  assert.equal(count,152);
});
test('self marks are bounded independently of checking and code legends use only present codes',()=>{
  const rows=[{id:'a',part:'a',code:'B1',marks:1,html:'A fact'},{id:'b',part:'a',code:'M2 FT',marks:2,html:'Working'}];
  assert.equal(selfMarkTotal(rows,{a:1,b:2}),3);assert.equal(selfMarkTotal(rows,{a:8,b:-2,extra:50}),1);
  assert.deepEqual(markingCodes(rows),['B','M','FT']);
});
