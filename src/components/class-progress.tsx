"use client";
import Link from "next/link";
import { useState } from "react";
import type { ClassProgressDto } from "@/lib/class-progress";
import { DateLabel, Empty, ErrorNotice, Heading, Loading, useLocale, useResource } from "./ui";

export function ClassProgress({ classId }: { classId: string }) {
  const { t } = useLocale(), r = useResource<ClassProgressDto>(`classes/${classId}/progress`);
  const [q, setQ] = useState(""), [filter, setFilter] = useState("ALL");
  if (r.error) return <ErrorNotice error={r.error} />;
  if (!r.data) return <Loading />;
  const d = r.data, students = d.students.filter(s => `${s.displayName} ${s.username}`.toLowerCase().includes(q.toLowerCase())
    && (filter === "ALL" || (filter === "REPEAT" ? s.needsRepeat > 0 : s.attempts === 0)));
  return <><Heading title={d.classroom.title + " · " + t("Прогресс", "Progress")} subtitle={t("Самостоятельная практика учеников и ваши задания этому классу.", "Students’ independent practice and your assignments to this class.")}>
    <Link className="button secondary" href={`/teacher/classes/${classId}`}>{t("Список и приглашения", "Roster & invitations")}</Link>
  </Heading><div className="grid three progress-summary">
    <div className="card"><p className="muted">{t("Начали практику или задания", "Started practice or assignments")}</p><strong className="metric">{d.summary.started} / {d.summary.students}</strong></div>
    <div className="card"><p className="muted">{t("Завершённые попытки", "Finished attempts")}</p><strong className="metric">{d.summary.completed}</strong></div>
    <div className="card"><p className="muted">{t("Задачи для повторения", "Tasks needing another look")}</p><strong className="metric">{d.summary.needsRepeat}</strong></div>
  </div><section className="card"><div className="field-grid">
    <label>{t("Найти ученика", "Find a student")}<input type="search" value={q} onChange={e => setQ(e.target.value)} /></label>
    <label>{t("Показать", "Show")}<select value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">{t("Всех учеников", "All students")}</option><option value="REPEAT">{t("Нужно повторить", "Needs another look")}</option><option value="NOT_STARTED">{t("Ещё не начали", "Not started yet")}</option></select></label>
  </div><p className="muted">{t("Полный балл без помощи считается по последней попытке задачи в теме. Самопроверка не считается правильным ответом.", "Full marks without help uses the latest attempt for each task in a topic. A self-check is not counted as a correct answer.")}</p>
    {!students.length ? <Empty /> : <div className="table-scroll"><table className="data class-progress-table"><thead><tr>
      {[t("Ученик", "Student"), t("Попытки", "Attempts"), t("Завершено", "Finished"), t("Практика: полный балл без помощи", "Practice: full marks without help"), t("Повторить", "Another look"), t("Последняя активность", "Last activity"), ""].map((h, i) => <th key={i}>{h}</th>)}
    </tr></thead><tbody>{students.map(s => <tr key={s.id}><td><strong>{s.displayName}</strong><div className="muted">{s.username}</div></td><td>{s.attempts}<div className="muted">{s.inProgress} {t("в работе", "in progress")}</div></td><td>{s.completed}</td><td>{s.withoutHelp} / {s.practiceTasks}<div className="muted">{s.selfSolved} {t("решено по самооценке", "self-assessed as solved")}</div></td><td>{s.needsRepeat}</td><td>{s.lastActive ? <DateLabel value={s.lastActive} /> : "—"}</td><td><Link className="button secondary" href={`/teacher/classes/${classId}/students/${s.id}`}>{t("Темы и ответы", "Topics & answers")} →</Link></td></tr>)}</tbody></table></div>}
  </section></>;
}
