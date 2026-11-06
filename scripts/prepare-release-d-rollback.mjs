// A local Git tree only: no second checkout, no production connection, no push.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const git=(args,options={})=>execFileSync('git',args,{encoding:'utf8',...options}).trim();
if(git(['branch','--show-current'])!=='main')throw Error('MAIN_REQUIRED');
git(['diff','--quiet']);git(['diff','--cached','--quiet']);
const h1='3b7a88782634dcbeb308339361037fa8aaf30ac0',parent=git(['rev-parse','HEAD']);
git(['merge-base','--is-ancestor',h1,parent]);
const folder=path.resolve('.local/release-d-20261106'),index=path.join(folder,'rollback-index');
if(fs.existsSync(index))throw Error('ROLLBACK_INDEX_ALREADY_EXISTS');
const env={...process.env,GIT_INDEX_FILE:index};
const isolated=args=>git(args,{env});
const branch='refs/heads/rollback/release-d-h1-compatible';
try{git(['show-ref','--verify',branch]);throw Error('ROLLBACK_BRANCH_ALREADY_EXISTS');}catch(e){if(e.message==='ROLLBACK_BRANCH_ALREADY_EXISTS')throw e;}
isolated(['read-tree',h1]);
function overlay(file,text){const blob=git(['hash-object','-w','--stdin'],{input:text});isolated(['update-index','--add','--cacheinfo','100644,'+blob+','+file]);}
for(const file of git(['ls-tree','-r','--name-only',parent,'--','prisma']).split('\n'))overlay(file,git(['show',parent+':'+file])+'\n');
// The historical CI fixtures must explicitly approve their own synthetic data.
// Copy only these small tests/helpers, never a database or a second application.
for(const file of ['tests/fixture-provenance.ts','tests/pilot-migration.test.ts','tests/bank-fixture.ts','tests/presentations-fixture.ts','tests/assessment-sources-fixture.ts','tests/student-progress-fixture.ts','tests/learning-mechanics-fixture.ts','tests/personal-learning-fixture.ts','src/lib/content-revisions.ts','src/lib/content-text-cleanup.ts']) {
 let text=execFileSync('git',['show',parent+':'+file],{encoding:'utf8'});
 // H1's DTO predates the administrator-only OCR argument introduced by Stage 6.
 if(file==='tests/bank-fixture.ts') {
  const stage6="assert.equal(publicVersion(old,'en',true).markSchemeStatus,undefined);assert.equal(publicVersion(old,'en',true,undefined,undefined,true).markSchemeStatus,'OCR_UNVERIFIED');";
  if(!text.includes(stage6))throw Error('RECOVERY_FIXTURE_REVIEW_REQUIRED');
  text=text.replace(stage6,"assert.equal(publicVersion(old,'en',true).markSchemeStatus,'OCR_UNVERIFIED');");
 }
 overlay(file,text);
}
let access=git(['show',h1+':src/lib/cambridge-access.ts'])+'\n';
access=access.replace('export const cambridgeScope', 'export const restrictedTask: Prisma.TaskWhereInput = { OR: [cambridgeTask, {examArchivedAt:{not:null}}, {origin:"UNKNOWN"}, {origin:{not:"ORIGINAL"},originManual:false}] };\nexport const cambridgeScope')
 .replaceAll('{ NOT: cambridgeTask }','{ examArchivedAt:null, origin:{not:"UNKNOWN"}, AND:[{OR:[{origin:"ORIGINAL"},{originManual:true}]}], NOT:cambridgeTask }')
 .replaceAll('task: cambridgeTask','task: restrictedTask').replaceAll('...cambridgeTask','...restrictedTask');
overlay('src/lib/cambridge-access.ts',access);
let catalog=git(['show',h1+':src/lib/catalog.ts'])+'\n';
catalog=catalog.replace('const clauses = [Prisma.sql`t.archivedAt IS NULL`];','const clauses = [Prisma.sql`t.archivedAt IS NULL`];\n  if (!actor || !isAdmin(actor)) clauses.push(Prisma.sql`t.examArchivedAt IS NULL AND t.origin <> \'UNKNOWN\' AND (t.origin=\'ORIGINAL\' OR t.originManual=true)`);');
overlay('src/lib/catalog.ts',catalog);
let content=git(['show',h1+':src/lib/content.ts'])+'\n';
content=content.replace('  teacher(actor);\n  const data = taskSchema.parse(input);','  teacher(actor);\n  ensure(isAdmin(actor),403,"ADMIN_PUBLICATION_REQUIRED");\n  const data = taskSchema.parse(input);');
overlay('src/lib/content.ts',content);
let api=git(['show',h1+':src/app/api/[...path]/route.ts'])+'\n';
api=api.replace('  try {\n    const parts =','  try {\n    ensure(!request.headers.get("X-Arena-View"),409,"VIEW_CONTEXT_CHANGED");\n    const parts =');
overlay('src/app/api/[...path]/route.ts',api);
overlay('docs/ARENA-RELEASE-D-RECOVERY.md',`# Emergency H1 interface, compatible with Release D schema\n\nPrepared from ${h1}, parent D ${parent}. The new schema and all migration checksums remain. Authored imports, responses, reviews, files and release receipts stay in the database. Exact H1 Cambridge restrictions, Demo/UNKNOWN quarantine and rejection of stale D view headers remain. Temporary teacher task editing is admin-only. New D interface, language routing, review panels and viewing lenses are absent in this emergency interface.\n\nNo data restoration or migration rollback is performed. Do not switch to the original unmodified H1 build. Use the owner runbook in the D report and verify the deployed D SHA before any recovery push.\n`);
const tree=isolated(['write-tree']);
const commit=git(['commit-tree',tree,'-p',parent,'-m','Prepare H1 recovery interface compatible with Arena release D schema']);
git(['update-ref',branch,commit,'0'.repeat(40)]);
fs.writeFileSync(path.join(folder,'rollback-preparation.json'),JSON.stringify({branch:branch.slice(11),commit,tree,parent,base:h1,localOnly:true},null,2));
console.log(JSON.stringify({branch:branch.slice(11),commit,parent,localOnly:true}));
