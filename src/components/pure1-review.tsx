"use client";
import Link from "next/link";
import {useContext} from "react";
import {ActorContext,ErrorNotice,useLocale,useResource,Loading} from "./ui";
import type {Pure1ReviewDto} from "@/lib/pure1-review";

export function Pure1Review(){
 const actor=useContext(ActorContext),{t,lang}=useLocale();
 return <section className="card" id="pure1-review"><h2>{t("Повторить · Pure 1","Review · Pure 1")}</h2>
 <p>{t("Сначала вернитесь к ошибкам, затем проверьте навыки после перерыва. Короткие проверки помогают выбрать следующий шаг.","Revisit mistakes first, then check skills after a break. Short checks help you choose your next step.")}</p>
 {actor?<PersonalReview key={actor.id+lang}/>:<p>{t("Войдите, чтобы составить повторение по вашим ответам.","Sign in to build a review plan from your own answers.")} <Link className="button secondary" href="/login">{t("Войти","Sign in")}</Link></p>}
 <Link href="/courses/maths4u-9709-p1">{t("Выбрать навык Pure 1","Choose a Pure 1 skill")} →</Link></section>;
}
function PersonalReview(){
 const {t,lang}=useLocale(),r=useResource<Pure1ReviewDto>("learning/pure1-review");
 if(r.error)return <ErrorNotice error={r.error}/>;if(!r.data)return <Loading/>;
 return <><p>{r.data.reviewedSkills?t(`Сейчас пора повторить: ${r.data.dueSkills}.`,`Skills due now: ${r.data.dueSkills}.`):t("Пока нечего повторять. Выполните короткую практику, чтобы начать свой план.","No checks to review yet. Try short practice to start your review plan.")}</p><div className="review-skill-grid">{r.data.skills.map(g=><article className="review-skill" key={g.block+g.skill}>
  <h3>{g.title}</h3><p>{g.due?t(`Проверок на сегодня: ${g.due}.`,`Checks due: ${g.due}.`):t("Следующее повторение: ","Next review: ")+new Date(g.nextDue).toLocaleDateString(lang==="ru"?"ru-RU":"en-GB",{day:"numeric",month:"short"})}</p>
  <p className="muted">{g.failed?t("Повторите задание с ошибкой.","Retry a missed answer."):g.weak?t("Закрепите навык без подсказки.","Consolidate this skill without help."):t("Проверьте, что осталось в памяти.","Check what you remember after a break.")}</p>
  <Link className="button" href={g.href}>{g.due?t("Повторить навык","Review this skill"):t("Практиковать заранее","Practise early")}</Link><p><Link href={g.notesHref}>{t("Открыть конспект","Read the notes")}</Link></p>
 </article>)}</div><p className="muted">{t("Интервалы повторения: 1, 3, 7 и 14 дней. После ошибки проверка возвращается на сегодня.","Review intervals: 1, 3, 7 and 14 days. A missed answer brings the check back today.")}</p></>;
}
