import {readFile,writeFile} from 'node:fs/promises';
import {renderContent} from '../../src/lib/content';
async function main(){
const root='.local/content-bank/publish';
const manifest=JSON.parse(await readFile(root+'/manifest.json','utf8'));
const errors:unknown[]=[];
for(const batch of manifest.batches.filter((b:{kind:string})=>b.kind==='tasks'))for(const row of JSON.parse(await readFile(root+'/batches/'+batch.key+'.json','utf8'))){
  for(const [i,t]of [...row.material.texts,...row.material.parts.flatMap((p:{texts:unknown[]})=>p.texts)].entries())for(const field of ['statement','answer','prompt','rubric','solution','markScheme','markSchemeText'])if(t[field]){
    const html=renderContent(t[field]);
    if(html.includes('katex-error'))errors.push({id:row.id,index:i,field,errors:[...html.matchAll(/<span class="katex-error"[^>]*>[\s\S]*?<\/span>/g)].map(x=>x[0]),source:t[field]});
  }
}
await writeFile('.local/content-bank/render-errors.json',JSON.stringify(errors,null,2));
console.log(JSON.stringify({count:errors.length,errors:errors.map(e=>{const r=e as {id:string;index:number;field:string};return {id:r.id,index:r.index,field:r.field}})}));
process.exitCode=errors.length?1:0;
}
main().catch(()=>{console.error('BANK_RENDER_CHECK_FAILED');process.exitCode=1;});
