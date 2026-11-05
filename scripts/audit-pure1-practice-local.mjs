// Read-only coverage report. Both connections are explicitly isolated loopback databases.
import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import path from 'node:path';
const runtime=JSON.parse(await fs.readFile('.local/content-bank/runtime.json','utf8')),url=new URL(runtime.MATHS4U_DATABASE_URL);
if(runtime.MATHS4U_ENV!=='test'||url.hostname!=='127.0.0.1'||!url.pathname.startsWith('/maths4u_test_bank_'))throw Error('LOCAL_ONLY');
const phpRoot='D:/www/AS&A level maths/AS-Alevel',pack=JSON.parse(await fs.readFile('content/original/pure1-short-practice-v1.json','utf8'));
const variants=JSON.parse(await fs.readFile('content/original/pure1-review-variants-v1.json','utf8')),baseCount=pack.questions.length;pack.questions.push(...variants.questions);
if(!Buffer.from(await fs.readFile(path.join(phpRoot,'content/original/pure1-short-practice-v1.json'))).equals(await fs.readFile('content/original/pure1-short-practice-v1.json')))throw Error('EDITORIAL_PACK_MISMATCH');
if(!Buffer.from(await fs.readFile(path.join(phpRoot,'content/original/pure1-review-variants-v1.json'))).equals(await fs.readFile('content/original/pure1-review-variants-v1.json')))throw Error('EDITORIAL_VARIANTS_MISMATCH');
const php=await mysql.createConnection({host:'127.0.0.1',port:33071,user:'root',password:'',database:'maths4u_current_20261030'}),arena=await mysql.createConnection(runtime.MATHS4U_DATABASE_URL);
try{
 const skills=[];
 for(const block of [...new Set(pack.questions.map(q=>q.block))]){
  const notes=JSON.parse(await fs.readFile(`content/original/${block}-v1.json`,'utf8'));
  for(const l of notes.lessons){
   const items=pack.questions.filter(q=>q.block===block&&q.skill===l.key),sid=l.php_subchapter_id,id='orig_'+block.replaceAll('-','_')+'_'+l.key.replaceAll('-','_');
   const [[old]]=await php.query("SELECT COUNT(*) n FROM questions WHERE subchapter_id=? AND (info IS NULL OR info NOT LIKE 'M4U-P1-QP-%')",[sid]);
   const [[inserted]]=await php.query("SELECT COUNT(*) n FROM questions WHERE info IN (?) AND is_published=1",[items.map(q=>q.uid)]);
   const [parts]=await arena.query('SELECT v.sourceUid,p.kind FROM LessonTask lt JOIN Task t ON t.id=lt.taskId JOIN TaskVersion v ON v.taskId=t.id JOIN TaskPart p ON p.versionId=v.id WHERE lt.lessonId=?',[id]);
   const previousAuto=parts.filter(p=>!p.sourceUid?.startsWith('M4U-P1-QP-')&&p.kind!=='MANUAL').length,added=parts.filter(p=>p.sourceUid?.startsWith('M4U-P1-QP-'));
   if(previousAuto!==0||inserted.n!==items.length||added.length!==items.length||new Set(added.map(q=>q.sourceUid)).size!==items.length)throw Error('COVERAGE_MISMATCH');
   skills.push({block,skill:l.key,title:l.title,phpSubchapterId:sid,legacyPhpTopicQuestionCount:old.n,legacyPhpCountMayBeSharedBetweenSkills:true,originalArenaAutomaticChecksBefore:previousAuto,notes:true,workedExamples:l.examples.length,writtenProblems:notes.problems.filter(p=>p.skill===l.key).length,newChecks:items.length,objectiveFamilies:items.filter(q=>!q.family_uid).length,reviewVariants:items.filter(q=>q.family_uid).length,numeric:items.filter(q=>q.kind==='NUMERIC').length,choice:items.filter(q=>q.kind==='CHOICE').length,focus:[...new Set(items.map(q=>q.focus))],editorialUids:items.map(q=>q.uid),phpRoute:`/original_practice.php?block=${block}&skill=${l.key}`,arenaRoute:`/courses/maths4u-9709-p1/topics/${id}`});
  }
 }
 const out={date:'2026-10-30',scope:'The 50 existing Maths4U Pure 1 skill briefs; a starter practice coverage audit, not a claim of mastery or teacher approval.',syllabusReference:'https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf',syllabusSections:['1.1 Quadratics','1.2 Functions','1.3 Coordinate geometry','1.4 Circular measure','1.5 Trigonometry','1.6 Series (including positive integer binomial expansion)','1.7 Differentiation','1.8 Integration'],legacyPhpGuidedPilot:{skills:5,activities:48,provenanceNotRelabelled:true},summary:{skills:skills.length,newChecks:pack.questions.length,numeric:pack.questions.filter(q=>q.kind==='NUMERIC').length,choice:pack.questions.filter(q=>q.kind==='CHOICE').length,skillsWithFourOrMoreChecks:skills.filter(s=>s.newChecks>=4).length,oldBankRetained:true,teacherReview:'pending',automaticCheckingAssesses:'A final numeric answer or a selected option, not written reasoning, proof or a drawn graph.'},skills};
 out.summary.baseChecks=baseCount;out.summary.reviewVariants=variants.questions.length;out.summary.objectiveFamilies=baseCount;
 const text=JSON.stringify(out,null,2)+'\n';await fs.writeFile('docs/PURE1-SKILL-COVERAGE-20261030.json',text);await fs.writeFile(path.join(phpRoot,'docs/pure1-skill-coverage-20261030.json'),text);console.log(JSON.stringify(out.summary));
}finally{await php.end();await arena.end();}
