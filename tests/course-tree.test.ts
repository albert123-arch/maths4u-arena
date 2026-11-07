import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCourseTreePlan,treeName,unallocatedId,unallocatedChapter,type TreeInput} from '../src/lib/course-tree-plan';
function fixture():TreeInput{return {courses:[{id:'course',slug:'further',title:'Further',chapters:[{id:'old',title:"Hooke’s law",lessons:[{id:'old1',title:'Elastic energy',position:0,taskIds:['a','b']}]},{id:'new',title:"Hooke's law",lessons:[{id:'energy',title:'Elastic energy',position:0,taskIds:['original']},{id:'systems',title:'Systems',position:1,taskIds:[]}]}]}],packages:[{courseSlug:'further',chapterId:'new',chapterTitle:"Hooke's law",lessons:[{id:'energy',title:'Elastic energy'},{id:'systems',title:'Systems'}],links:[{uid:'authored',taskId:'a',lessonId:'systems'}]}],archiveTaskIds:['a','b'],approvals:[]};}
test('One Tree uses exact provenance and never treats a proposal as approval',()=>{
 const p=buildCourseTreePlan(fixture());assert.equal(p.chapters[0].canonicalTopicId,'new');assert.equal(p.lessons[0].proposedLessonId,'systems');assert.equal(p.lessons[0].approvedLessonId,null);
 assert.deepEqual(p.placements.map(p=>[p.taskId,p.targetLessonId,p.method]),[['a','systems','PROVENANCE'],['b',null,'UNALLOCATED']]);
 const f=fixture();f.approvals=[{sourceLessonId:'old1',approvedLessonId:'energy'}];const approved=buildCourseTreePlan(f);
 assert.deepEqual(approved.placements.map(p=>[p.taskId,p.targetLessonId,p.method]),[['a','systems','PROVENANCE'],['b','energy','APPROVED_MAP']]);
 assert.equal(new Set(p.placements.map(p=>p.courseId+':'+p.taskId)).size,p.placements.length);
});
test('Archive-only chapters automatically gain a canonical layer when a package arrives',()=>{
 const f=fixture();f.packages=[];assert.equal(buildCourseTreePlan(f).chapters.length,0);
 f.packages=fixture().packages;f.courses[0].chapters.push({id:'momentum-old',title:'Momentum',lessons:[{id:'impulse',title:'Impulse',position:0,taskIds:['c']}]});f.archiveTaskIds.push('c');
 assert.equal(buildCourseTreePlan(f).placements.find(p=>p.taskId==='c')?.method,'LEGACY');
 f.courses[0].chapters.push({id:'momentum-new',title:'Momentum',lessons:[{id:'momentum-lesson',title:'Momentum models',position:0,taskIds:[]}]});f.packages.push({courseSlug:'further',chapterId:'momentum-new',chapterTitle:'Momentum',lessons:[{id:'momentum-lesson',title:'Momentum models'}],links:[]});
 const placement=buildCourseTreePlan(f).placements.find(p=>p.taskId==='c')!;assert.equal(placement.method,'UNALLOCATED');assert.equal(placement.targetTopicId,'momentum-new');
});
test('Plans reject conflicting exact destinations and cross-chapter approvals',()=>{
 const f=fixture();f.packages[0].links.push({uid:'another',taskId:'a',lessonId:'energy'});assert.throws(()=>buildCourseTreePlan(f),/CONFLICTING_PROVENANCE/);
 const g=fixture();g.approvals=[{sourceLessonId:'old1',approvedLessonId:'elsewhere'}];assert.throws(()=>buildCourseTreePlan(g),/APPROVAL_OUTSIDE/);
 const h=fixture();h.packages[0].links[0].lessonId='missing';assert.throws(()=>buildCourseTreePlan(h),/NOT_INSTALLED/);
 assert.equal(treeName("Hooke’s law"),treeName("Hooke's law"));assert.equal(unallocatedChapter(unallocatedId('chapter')),'chapter');assert.equal(unallocatedChapter('ordinary'),null);
});
