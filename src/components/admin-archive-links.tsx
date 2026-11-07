"use client";
import Link from 'next/link';
import {useContext} from 'react';
import {ActorContext,useLocale,useResource} from './ui';
import {useView} from './view-state';
type Context={count:number;links:{id:string;href:string;label:string}[];origin?:{title:string;destinations:{id:string;title:string;count:number;href:string}[]}};
export function ArchiveOriginNavigation({legacyLesson}:{legacyLesson:string}){
 const actor=useContext(ActorContext),lens=useView(),{t}=useLocale(),allowed=!!actor?.roles.some(r=>r.role==='ADMIN')&&!lens;
 const r=useResource<Context>(allowed&&legacyLesson?'admin/course-tree/context?legacyLesson='+encodeURIComponent(legacyLesson):null);
 if(!allowed||!r.data?.origin)return null;
 return <nav className="archive-origin-navigation" aria-label={t('Размещение старого урока','Archived lesson destinations')}><p>{t('Архивный урок: ','Archived lesson: ')}<strong>{r.data.origin.title}</strong></p><div className="topic-shortcuts">{r.data.origin.destinations.map(d=><Link key={d.id} href={d.href}>{d.title} · {d.count}</Link>)}</div></nav>;
}
export function AdminArchiveLinks({lessonId,uid}:{lessonId?:string;uid?:string}){
 const actor=useContext(ActorContext),lens=useView(),{t}=useLocale(),allowed=!!actor?.roles.some(r=>r.role==='ADMIN')&&!lens;
 const params=new URLSearchParams({...lessonId?{lesson:lessonId}:{},...uid?{uid}:{}}),r=useResource<Context>(allowed?'admin/course-tree/context?'+params:null);
 if(!allowed||!r.data)return null;
 return <nav className="archive-related" aria-label={t('Архив Cambridge','Cambridge archive')}>
  {!!r.data.count&&lessonId&&<Link className="archive-badge" href={locationPath(lessonId)+'?mode=WRITTEN&source=CAMBRIDGE'}>Cambridge · {r.data.count}</Link>}
  {r.data.links.map(link=><Link key={link.id} href={link.href}>{t('Сравнить с источником Cambridge','Compare with Cambridge source')} →</Link>)}
 </nav>;
}
function locationPath(lessonId:string){return typeof window==='undefined'?'#':window.location.pathname.replace(/\/topics\/[^/]+$/,'/topics/'+lessonId);}
