import {db} from './prisma';
import {digest} from './security';
import {contentPackage,packageTopic} from './content-package-content';
import {quadraticTopics} from './square-model';
import type {ContentPackage} from './content-package-schema';

type State={state:string;version:string;fingerprint:string}|null;
const installed=(key:string):Promise<State>=>db().contentPackage.findUnique({where:{key},select:{state:true,version:true,fingerprint:true}});
export function matchesPublishedPackage(p: ContentPackage, state: State) {
  return state?.state === 'PUBLISHED' && state.version === p.version && state.fingerprint === digest(JSON.stringify(p));
}
/** A new code bundle must not take over an existing lesson before its data is published. */
export async function publicLearningTopic(lessonId:string,read:typeof installed=installed){
  const packaged=packageTopic(lessonId),previous=quadraticTopics.find(t=>t.lessonId===lessonId);
  if(packaged){
    const p=contentPackage(packaged.packageKey!),state=await read(p.key);
    if(matchesPublishedPackage(p,state))return packaged;
  }
  return previous;
}
