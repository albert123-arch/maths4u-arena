import test from 'node:test';
import assert from 'node:assert/strict';
import {contentPackage,packageTopic} from '../src/lib/content-package-content';
import {gradeSquare,squarePublicLesson,squareHelp,squareMarkingRows,questionsForTopic} from '../src/lib/square-content';
import {packageTask} from '../src/lib/content-packages';
import {squareSnapshot,nextSquareReview} from '../src/lib/square-model';
const p=contentPackage('9231-mechanics-momentum');

test('Momentum accepts equivalent complete answers but rejects wrong signs, unphysical restitution and the wrong event time',()=>{
 const get=(suffix:string)=>({...p.questions.find(q=>q.id==='M4U-9231-MMOM-'+suffix)!,provenance:undefined});
 assert(gradeSquare(get('D11'),{va:'4/2',vb:'5',Ja:'-8',lost:'24'}).correct);
 assert(!gradeSquare(get('D11'),{va:'2',vb:'5',Ja:'8',lost:'24'}).correct);
 assert(gradeSquare(get('F11'),{vx:'4',vy:'6',Jx:'36',Jy:'0',lost:'72'}).correct);
 assert(!gradeSquare(get('F11'),{vx:'4',vy:'-6',Jx:'36',Jy:'0',lost:'72'}).correct);
 assert(gradeSquare(get('B31'),{e:'3/5',vax:'2',vay:'4',vbx:'8',vby:'-4'}).correct);
 assert(!gradeSquare(get('B31'),{e:'-3/5',vax:'2',vay:'4',vbx:'8',vby:'-4'}).correct);
 assert(gradeSquare(get('C21'),{twall:'2',time:'6',position:'6',va:'-1/2',vb:'1/2'}).correct);
 assert(!gradeSquare(get('C21'),{twall:'2',time:'4',position:'6',va:'-1/2',vb:'1/2'}).correct);
 assert(gradeSquare(get('C31'),{time:'12/5',distance:'24/5',after:'3/2',height:'9/80'}).correct);
});

test('Momentum preserves all 39 owner identities, 91 parts, 307 marks and the 16 figure roles',()=>{
 const written=p.questions.filter(q=>q.collection==='exam');
 assert.equal(written.length,39);assert.equal(written.reduce((n,q)=>n+q.parts.length,0),91);assert.equal(written.reduce((n,q)=>n+q.marks,0),307);
 assert.equal(written.filter(q=>q.provenance).length,39);assert.deepEqual(p.source.held,[]);
 assert.equal(new Set(written.map(q=>q.provenance!.archiveTaskId)).size,39);
 assert.deepEqual(p.lessons.map(l=>[l.key,written.filter(q=>q.lesson===l.key).length]),[['direct',6],['surfaces',8],['spheres',16],['successive',9]]);
 assert.equal(p.assets!.filter(a=>a.role==='STATEMENT').length,14);assert.equal(p.assets!.filter(a=>a.role==='SOLUTION').length,2);
 for(const q of written){assert(packageTask(p,q).parts.every(part=>part.kind==='MANUAL'));assert(q.parts.every(part=>part.marking_criteria.every(c=>c.code==='')));}
 for(const a of p.assets!){const q=written.find(q=>q.id===a.question_uid)!;assert((a.role==='STATEMENT'?q.prompt_html:q.solution_html).includes('/api/files/'+a.file_id));if(a.role==='SOLUTION')assert(!q.prompt_html.includes(a.file_id));}
});

test('Momentum checks every field of complete answers, protects provenance and renders mathematical feedback',()=>{
 for(const l of p.lessons){
  const dto=squarePublicLesson(packageTopic(l.id)!);assert.equal(dto.examples.length,4);assert.equal(dto.questions.filter(q=>q.collection!=='exam').length,8);assert(dto.questions.filter(q=>q.collection==='exam').length>=6);
  for(const hidden of ['"expected"','"source_uid"','"ownerProvenance"','"verification"','source_archive'])assert(!JSON.stringify(dto).includes(hidden));
  for(const text of [l.objective,l.before,l.ideas,l.method,...l.examples.flatMap(e=>[e.question,e.solution]),dto.notes,...dto.examples.flatMap(e=>[e.question,e.solution])]){
   assert(!text.includes('katex-error'),l.id);assert(!/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/.test(text),'Invalid character in '+l.id);
  }
  for(const e of dto.examples)assert((e.question+e.solution).includes('class="katex"'),e.title);
  for(const q of questionsForTopic(l.id)){
   assert.equal(squareMarkingRows(q).reduce((n,c)=>n+c.marks,0),q.marks);
   for(const value of [q.prompt_html,squareHelp(q,'hint'),squareHelp(q,'solution'),...squareMarkingRows(q).map(c=>c.html)])assert(!value.includes('katex-error'),q.id);
   if(!q.fields.length){assert.equal(gradeSquare(q,{}).valid,false);continue;}
   const answers=Object.fromEntries(q.fields.map(f=>[f.key,Array.isArray(f.expected)?f.expected.join(';'):f.expected]));
   assert(gradeSquare(q,answers).correct,q.id);
   for(const f of q.fields){const omitted={...answers};delete omitted[f.key];assert(!gradeSquare(q,omitted).correct,q.id+' missing '+f.key);const wrong=f.type==='choice'?Object.keys(f.options!).find(key=>key!==f.expected)!:f.type==='ratio'?'999;1':'999';assert(!gradeSquare(q,{...answers,[f.key]:wrong}).correct,q.id+' wrong '+f.key);}
  }
  const first=dto.questions.find(q=>q.collection==='short')!,snapshot=squareSnapshot([{eventKey:'weak',uid:first.uid,family:first.family,correct:false,helpUsed:false,at:1000}]);
  const next=nextSquareReview(dto.questions,snapshot,1000)[0];assert.equal(next.collection,'variant');assert.equal(next.family,first.family);assert.notEqual(next.uid,first.uid);
 }
});
