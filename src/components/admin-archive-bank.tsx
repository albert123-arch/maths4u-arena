"use client";
import Link from 'next/link';
import {CatalogTasks} from './catalog-screen';
import {Heading,useResource,useLocale,ErrorNotice} from './ui';
import type {courseCatalog} from '@/lib/catalog';
export function AdminArchiveBank(){
 const {t}=useLocale(),r=useResource<Awaited<ReturnType<typeof courseCatalog>>>('admin/course-tree/catalog');
 const query=typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search),selected=r.data?.find(c=>c.id===query.get('course'));
 const path=(values:Record<string,string>)=>'/admin/archive-bank?'+new URLSearchParams({source:'CAMBRIDGE',...values});
 return <><Heading title={t('Архив Cambridge','Cambridge question archive')} subtitle={t('Сохранённые исходные задачи для вашей работы и сравнения с адаптациями.','Preserved source questions for your reference and comparison with adaptations.')}/><p><Link href="/admin">← {t('Кабинет администратора','Admin dashboard')}</Link></p><ErrorNotice error={r.error}/>
  <div className="grid two archive-course-cards">{r.data?.filter(c=>!!c.cambridgeCount).map(c=><a className="card" href={path({course:c.id})} key={c.id}><h2>{c.title}</h2><p>Cambridge · {c.cambridgeCount}</p></a>)}</div>
  {selected&&<section className="card"><h2>{selected.title}</h2>{[...selected.chapters,...(selected.archiveChapters??[])].filter(ch=>!!ch.cambridgeCount).map(ch=><article className="item" key={ch.id}><h3><a href={path({course:selected.id,chapter:ch.id})}>{ch.title} · {ch.cambridgeCount}</a>{ch.archiveOnly&&<span className="archive-badge">{t('Только архив','Archive only')}</span>}</h3><div className="topic-shortcuts">{ch.topics.filter(l=>!!l.cambridgeCount).map(l=><a href={path({course:selected.id,chapter:ch.id,topic:l.id})} key={l.id}>{l.title} · {l.cambridgeCount}</a>)}{ch.unallocated&&<a href={path({course:selected.id,chapter:ch.id,topic:ch.unallocated.id})}>{t('Не распределено','Unallocated')} · {ch.unallocated.count}</a>}</div></article>)}</section>}
  <section className="card"><CatalogTasks adminArchive practice/></section>
 </>;
}
