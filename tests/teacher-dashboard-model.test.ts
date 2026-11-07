import { test } from 'node:test';
import assert from 'node:assert/strict';
import { teacherDashboardModel, teacherWorkSummary, hasUnmarkedManualPart, type TeacherWork, type TeacherAttempt, type TeacherQuestion, type TeacherClass } from '../src/lib/teacher-dashboard-model';
const now = Date.UTC(2026, 10, 7, 12), day = 86400000;
const students = [{ id:'s1',displayName:'Learner One',username:'one' },{ id:'s2',displayName:'Learner Two',username:'two' }];
const classes:TeacherClass[]=[{id:'a',title:'Class A',joinCode:'invite-a',students},{id:'b',title:'Class B',joinCode:'invite-b',students:[students[0]]}];
const q:TeacherQuestion={id:'q',title:'Original question',maximum:10,examStyle:true,locations:[{courseId:'c',chapterId:'ch',lessonId:'l',href:'/courses/c/topics/l'}]};
const attempt=(id:string,overrides:Partial<TeacherAttempt>={}):TeacherAttempt=>({id,userId:'s1',student:'Learner One',status:'GRADED',startedAt:now-day,submittedAt:now-day+100,expiresAt:now+day,pending:false,helped:false,questions:[{...q,points:10}],...overrides});
const work=(attempts:TeacherAttempt[]=[],overrides:Partial<TeacherWork>={}):TeacherWork=>({id:'w',title:'Original class work',classId:'a',classTitle:'Class A',kind:'TEST',archived:false,resultsPublished:false,versions:[{id:'v',opensAt:now-2*day,dueAt:now+day,questions:[q],attempts}],...overrides});
function model(works:TeacherWork[]=[],extra:Partial<Parameters<typeof teacherDashboardModel>[0]>={}){return teacherDashboardModel({classes,works,practice:[],courses:[{id:'c',title:'Further Pure 1',slug:'fp1'}],chapters:[{id:'ch',title:'Roots',lessons:[{id:'l',title:'Coefficients',href:'/courses/c/topics/l',questions:[q]}]}],courseId:'c',classId:null,now,weekStart:now-7*day,...extra});}

test('teacher summary counts a student once when enrolled in two classes',()=>{const d=model();assert.equal(d.summary.classes,2);assert.equal(d.summary.students,2);assert.equal(d.progress.students.length,2);});
test('assignment progress uses the latest attempt, not the number of retries',()=>{
 const a=attempt('old'),b=attempt('new',{startedAt:now,status:'IN_PROGRESS',submittedAt:null,questions:[{...q,points:null}]});
 const d=teacherWorkSummary(work([a,b]),classes,now);assert.equal(d.submitted,0);assert.equal(d.inProgress,1);assert.equal(d.notStarted,1);assert.equal(d.average,100);
});
test('current-version progress never reuses a previous-version grade',()=>{
 const w=work([]);w.versions.push({...w.versions[0],id:'old-version',attempts:[attempt('old')]});const d=teacherWorkSummary(w,classes,now);assert.equal(d.submitted,0);assert.equal(d.average,null);
 assert.equal(model([w]).progress.students[0].cells[0].solved,1,'historical learning evidence is retained separately');
});
test('checked work averages are weighted by marks rather than question percentages',()=>{
 const q2={...q,id:'q2',maximum:20},a=attempt('a',{questions:[{...q,points:5},{...q2,points:20}]});const d=teacherWorkSummary(work([a]),classes,now);assert.equal(d.average,83);assert.equal(d.markedStudents,1);
});
test('missing marks remain missing, not zero or a fabricated average',()=>{
 const d=teacherWorkSummary(work([attempt('a',{questions:[{...q,points:null}]})]),classes,now);assert.equal(d.average,null);assert.equal(d.markedStudents,0);assert.equal(model([work([attempt('a',{questions:[{...q,points:null}]})])]).progress.average,null);
});
test('marking includes every pending historical version, oldest first, beyond twenty',()=>{
 const attempts=Array.from({length:25},(_,i)=>attempt(String(i).padStart(2,'0'),{userId:i%2?'s2':'s1',status:'SUBMITTED',pending:true,startedAt:now-i*1000,submittedAt:now-i*1000,questions:[{...q,points:null}]}));
 const d=model([work(attempts)]);assert.equal(d.pendingCount,25);assert.equal(d.pending[0].id,'24');assert.equal(d.pending.at(-1)?.id,'00');
});
test('archived work remains in history and stays out of the active marking queue',()=>{
 const d=model([work([attempt('a',{status:'SUBMITTED',pending:true})],{archived:true})]);assert.equal(d.pendingCount,0);assert.equal(d.assignments.length,1);assert.equal(d.summary.assignments,0);
});
test('class filter scopes assignments, members and marking without changing stored evidence',()=>{
 const a=work([attempt('a',{status:'SUBMITTED',pending:true})]),b=work([attempt('b',{status:'SUBMITTED',pending:true})],{id:'wb',classId:'b',classTitle:'Class B'}),d=model([a,b],{classId:'b'});
 assert.equal(d.classes.length,1);assert.equal(d.summary.students,1);assert.deepEqual(d.pending.map(p=>p.id),['b']);assert.equal(d.progress.classroom?.id,'b');
});
test('a later mark in a second class cannot replace this class mark',()=>{
 const a=work([attempt('a')]),b=work([attempt('b',{startedAt:now,questions:[{...q,points:0}]})],{id:'wb',classId:'b'}),d=model([a,b]);
 assert.equal(d.progress.students[0].cells[0].solved,1);assert.equal(d.progress.students[0].average,100);assert.equal(d.classes.find(c=>c.id==='a')?.average,100);assert.equal(d.classes.find(c=>c.id==='b')?.average,0);
});
test('latest wrong answer replaces an earlier success and flags a revisit once',()=>{
 const a=work([attempt('old'),attempt('new',{startedAt:now,questions:[{...q,points:3}]})]),d=model([a]),cell=d.progress.students[0].cells[0];
 assert.equal(cell.solved,0);assert.equal(cell.due,1);assert.equal(cell.evidence.length,1);assert.equal(cell.solved+cell.tried+cell.due+cell.untouched,cell.total);
});
test('recorded help never establishes verified full-mark independence',()=>{
 const d=model([work([attempt('a',{helped:true})])]);assert.equal(d.progress.students[0].cells[0].solved,0);assert.equal(d.progress.students[0].cells[0].tried,1);
});
test('an empty course cell stays untried; no reading or self-mark input implies mastery',()=>{
 const d=model(),cell=d.progress.students[0].cells[0];assert.deepEqual([cell.solved,cell.tried,cell.due,cell.untouched],[0,0,0,1]);assert.equal(d.progress.average,null);assert.equal(d.progress.chapterAverages[0].percent,0);
});
test('overdue counts only current members who have not submitted; pending marking is not missing',()=>{
 const w=work([attempt('a',{status:'SUBMITTED',pending:true})]);w.versions[0].dueAt=now;const d=model([w]);assert.equal(d.attention.find(s=>s.id==='s1')?.overdue??0,0);assert.equal(d.attention.find(s=>s.id==='s2')?.overdue,1);
});
test('attention deduplicates cross-enrolled students and retains the strongest reason',()=>{
 const a=work([]),b=work([],{id:'b-work',classId:'b'});a.versions[0].dueAt=now-1;b.versions[0].dueAt=now-1;const d=model([a,b]);assert.equal(d.attention.filter(s=>s.id==='s1').length,1);assert.ok(d.attention[0].overdue>0);
});
test('common difficulties are actual marked losses in the selected class and recent window',()=>{
 const old=attempt('old',{userId:'s2',startedAt:now-9*day,submittedAt:now-9*day,questions:[{...q,points:0}]}),recent=attempt('recent',{questions:[{...q,points:5}]}),d=model([work([old,recent])]);assert.equal(d.difficulties.length,1);assert.deepEqual(d.difficulties[0].studentIds,['s1']);
});
test('upcoming shows real opening and due dates within the next seven days',()=>{
 const w=work([]);w.versions[0].opensAt=now+day;w.versions[0].dueAt=now+3*day;const d=model([w]);assert.deepEqual(d.upcoming.map(e=>e.kind),['opens','due']);assert.equal(d.preparation?.id,'l');
});
test('short practice does not become an exam average; no AI integration is invented',()=>{
 const d=model([work([attempt('a',{questions:[{...q,examStyle:false,points:4}]})])]);assert.equal(d.progress.average,null);assert.equal(d.aiConnected,false);
});
test('a new ungraded attempt does not erase a previous checked exam average',()=>{const d=model([work([attempt('old'),attempt('new',{startedAt:now,status:'SUBMITTED',pending:true,questions:[{...q,points:null}]})])]);assert.equal(d.progress.students[0].average,100);assert.equal(d.progress.students[0].cells[0].solved,0);});
test('recent grading of older work counts as a recent difficulty without inventing student activity',()=>{const d=model([work([attempt('old',{startedAt:now-9*day,submittedAt:now-8*day,markedAt:now,questions:[{...q,points:5}]})])]);assert.equal(d.difficulties.length,1);assert.equal(d.classes[0].activeThisWeek,0);});
test('a recent submission is student activity even if the attempt began before this week',()=>{const d=model([work([attempt('old',{startedAt:now-9*day,submittedAt:now})])]);assert.equal(d.classes[0].activeThisWeek,1);});
test('manual marking remains pending with a missing answer or a comment without points; zero is marked',()=>{const p=[{id:'p',kind:'MANUAL'}];assert.equal(hasUnmarkedManualPart(p,[]),true);assert.equal(hasUnmarkedManualPart(p,[{partId:'p',review:{points:null}}]),true);assert.equal(hasUnmarkedManualPart(p,[{partId:'p',review:{points:0}}]),false);assert.equal(hasUnmarkedManualPart([{id:'p',kind:'NUMERIC'}],[]),false);});
