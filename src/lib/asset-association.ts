import type {TaskInput} from './content';
// Move only explicitly linked image elements; surrounding mathematical text stays intact.
export function reassignAsset(task:TaskInput,index:number,role:TaskInput['assets'][number]['role']) {
  const asset=task.assets[index];if(asset.role===role)return;
  const fields={STATEMENT:'statement',ANSWER:'answer',HINT:'hint',SOLUTION:'solution',MARK_SCHEME:'markScheme',TEACHER:'teacherNote'} as const;
  const from=fields[asset.role],to=fields[role];
  for(const text of task.texts){if(asset.locale&&asset.locale!==text.locale)continue;const images:string[]=[];
    text[from]=(text[from]??'').replace(/<img\b[^>]*>/gi,tag=>{const src=/\bsrc\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2];if(src!==('/api/files/'+asset.fileId))return tag;images.push(tag);return '';});
    if(images.length)text[to]=(text[to]??'')+images.join('');
  }asset.role=role;
}
