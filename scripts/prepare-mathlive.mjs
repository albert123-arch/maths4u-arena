import {copyFile,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),source=path.join(root,'node_modules','mathlive'),target=path.join(root,'public','assets','mathlive');
const metadata=JSON.parse(await readFile(path.join(source,'package.json'),'utf8'));
if(metadata.name!=='mathlive')throw Error('MATHLIVE_PACKAGE_REQUIRED');
await mkdir(path.join(target,'fonts'),{recursive:true});
for(const entry of await readdir(path.join(source,'fonts'),{withFileTypes:true})){
  if(!entry.isFile()||!entry.name.endsWith('.woff2'))continue;
  await copyFile(path.join(source,'fonts',entry.name),path.join(target,'fonts',entry.name));
}
// Preserve the licence text, normalising trailing whitespace for a clean Git diff.
await writeFile(path.join(target,'LICENSE.txt'),(await readFile(path.join(source,'LICENSE.txt'),'utf8')).replace(/[ \t]+$/gm,''));
console.log(`Prepared self-hosted MathLive ${metadata.version} fonts and licence.`);
