import {db} from './prisma';
import {digest} from './security';
import {bankRevision,contentPackage,packageTopic} from './content-package-content';
import {quadraticTopics,type QuadraticTopic} from './square-model';
import type {ContentPackage} from './content-package-schema';

type State={state:string;version:string;fingerprint:string}|null;
const installed=(key:string):Promise<State>=>db().contentPackage.findUnique({where:{key},select:{state:true,version:true,fingerprint:true}});
export function matchesPublishedPackage(p: ContentPackage, state: State) {
  return state?.state === 'PUBLISHED' && state.version === p.version && state.fingerprint === digest(JSON.stringify(p));
}
export function publishedPackage(p: ContentPackage, state: State) {
  if (matchesPublishedPackage(p,state)) return p;
  const previous = bankRevision(p.key)?.previous;
  if (previous && matchesPublishedPackage(previous,state)) return previous;
}
/** Before applying a bank revision, keep the installed release on every practice path. */
export async function activeBankTopic(topic: QuadraticTopic | undefined) {
  if (!topic?.packageKey || !bankRevision(topic.packageKey)) return topic;
  const state = await installed(topic.packageKey);
  if (!state || state.state === 'ARCHIVED') return undefined;
  const active = packageTopic(topic.lessonId,state.version);
  return active && state.fingerprint === digest(JSON.stringify(contentPackage(topic.packageKey,active.version))) ? active : undefined;
}
/** A new code bundle must not take over an existing lesson before its data is published. */
export async function publicLearningTopic(lessonId:string,read:typeof installed=installed){
  const packaged=packageTopic(lessonId),previous=quadraticTopics.find(t=>t.lessonId===lessonId);
  if(packaged){
    const p=contentPackage(packaged.packageKey!),state=await read(p.key);
    const active = publishedPackage(p,state);
    if(active)return packageTopic(lessonId,active.version);
  }
  return previous;
}
