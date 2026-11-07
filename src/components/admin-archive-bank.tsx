"use client";
import Link from 'next/link';
import {useState} from 'react';
import {CatalogTasks} from './catalog-screen';
import {Heading,useResource,useLocale,ErrorNotice,api} from './ui';
import {Button} from './controls';
import type {courseCatalog} from '@/lib/catalog';
import type {planCourseTree} from '@/lib/course-tree';
export function AdminArchiveBank(){
 const {t}=useLocale(),r=useResource<Awaited<ReturnType<typeof courseCatalog>>>('admin/course-tree/catalog');
 const [plan,setPlan]=useState<Awaited<ReturnType<typeof planCourseTree>>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),[receipt,setReceipt]=useState<{writes:number}|null>(null);
 async function dryRun(){setBusy(true);setError(null);setReceipt(null);try{setPlan(await api('admin/course-tree'));}catch(e){setError(e);}finally{setBusy(false);}}
 async function apply(){if(!plan)return;setBusy(true);setError(null);try{setReceipt(await api('admin/course-tree/apply','POST',{token:plan.token}));setPlan(null);r.refresh();}catch(e){setError(e);}finally{setBusy(false);}}
 const query=typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search),selected=r.data?.find(c=>c.id===query.get('course'));
 const path=(values:Record<string,string>)=>'/admin/archive-bank?'+new URLSearchParams({source:'CAMBRIDGE',...values});
 return <><Heading title={t('Архив Cambridge','Cambridge question archive')} subtitle={t('Сохранённые исходные задачи для вашей работы и сравнения с адаптациями.','Preserved source questions for your reference and comparison with adaptations.')}/><p><Link href="/admin">← {t('Кабинет администратора','Admin dashboard')}</Link></p><ErrorNotice error={r.error}/>
  <details className="card"><summary>{t('Обновить размещение архива','Update archive placement')}</summary><p>{t('Пробный запуск ничего не записывает. Применение использует точные связи источников; запасные соответствия требуют отдельного утверждения владельца. Задачи и прогресс сохраняются.','The dry run makes no changes. Applying uses exact source links; fallback mappings need separate owner approval. Tasks and progress are preserved.')}</p><ErrorNotice error={error}/><div className="row"><Button disabled={busy} onClick={()=>void dryRun()}>{t('Проверить размещение','Dry run placement')}</Button>{plan&&<Button disabled={busy} onClick={()=>void apply()}>{t('Применить размещение','Apply placement')}</Button>}</div>{plan&&<p role="status">{plan.result.placements.length} {t('задач','questions')} · {plan.result.placements.filter(p=>p.method==='PROVENANCE').length} {t('точных связей','exact links')} · {plan.result.placements.filter(p=>p.method==='UNALLOCATED').length} {t('не распределено','unallocated')}</p>}{receipt&&<p role="status">{t('Записей изменено: ','Rows changed: ')}{receipt.writes}</p>}</details>
  <div className="grid two archive-course-cards">{r.data?.filter(c=>!!c.cambridgeCount).map(c=><a className="card" href={path({course:c.id})} key={c.id}><h2>{c.title}</h2><p>Cambridge · {c.cambridgeCount}</p></a>)}</div>
  {selected&&<section className="card"><h2>{selected.title}</h2>{[...selected.chapters,...(selected.archiveChapters??[])].filter(ch=>!!ch.cambridgeCount).map(ch=><article className="item" key={ch.id}><h3><a href={path({course:selected.id,chapter:ch.id})}>{ch.title} · {ch.cambridgeCount}</a>{ch.archiveOnly&&<span className="archive-badge">{t('Только архив','Archive only')}</span>}</h3><div className="topic-shortcuts">{ch.topics.filter(l=>!!l.cambridgeCount).map(l=><a href={path({course:selected.id,chapter:ch.id,topic:l.id})} key={l.id}>{l.title} · {l.cambridgeCount}</a>)}{ch.unallocated&&<a href={path({course:selected.id,chapter:ch.id,topic:ch.unallocated.id})}>{t('Не распределено','Unallocated')} · {ch.unallocated.count}</a>}</div></article>)}</section>}
  <section className="card"><CatalogTasks adminArchive practice/></section>
 </>;
}
