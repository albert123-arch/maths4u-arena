"use client";
import Link from "next/link";
import { useState } from "react";
import type { StudentProgressDto, MyProgressDto } from "@/lib/student-progress";
import { DateLabel, Empty, ErrorNotice, Heading, Loading, Status, useLocale, useResource } from "./ui";

export function StudentProgress({ classId, studentId }: { classId: string; studentId: string }) {
  return <ProgressView classId={classId} studentId={studentId} />;
}
export function MyProgress() { return <ProgressView own />; }
function ProgressView({ classId, studentId, own = false }: { classId?: string; studentId?: string; own?: boolean }) {
  const { t } = useLocale();
  const [page, setPage] = useState(1), [kind, setKind] = useState("ALL"), [lessonId, setLessonId] = useState("");
  const r = useResource<StudentProgressDto | MyProgressDto>(`${own ? "learning/progress" : `classes/${classId}/students/${studentId}/progress`}?page=${page}&kind=${kind}${lessonId ? "&lessonId=" + encodeURIComponent(lessonId) : ""}`);
  if (r.error) return <ErrorNotice error={r.error} />;
  if (!r.data) return <Loading />;
  const d = r.data, courses = [...new Set(d.topics.map(topic => topic.courseId))];
  return <><Heading title={own ? t("Мой прогресс", "My progress") : d.student.displayName} subtitle={"classroom" in d ? `${d.classroom.title} · ${d.student.username}` : t("Самостоятельная практика и задания ваших учителей.", "Independent practice and your teachers’ assignments.")}>
    <Link className="button secondary" href={own ? "/student" : `/teacher/classes/${classId}/progress`}>{own ? t("В кабинет", "Back to dashboard") : t("К классу", "Back to class")}</Link>
  </Heading>
    {!own && <p className="muted">{t("Самостоятельная практика и ваши задания этому классу. В письменной практике видна самооценка ученика. Ответы на задания класса и ранее отправленные работы доступны для проверки.", "Independent practice and your assignments to this class. Written self-study shows the student’s own assessment. Submitted class assignments and historical answers remain available for review.")}</p>}
    <div className="grid three progress-summary">
      <div className="card"><p className="muted">{t("Начато попыток", "Attempts started")}</p><strong className="metric">{d.summary.attempts}</strong><p>{d.summary.inProgress} {t("в работе", "in progress")}</p></div>
      <div className="card"><p className="muted">{t("Завершённые занятия", "Finished activities")}</p><strong className="metric">{d.summary.completed}</strong><p>{d.summary.graded} {t("проверено", "graded")}</p></div>
      <div className="card"><p className="muted">{t("Нужно повторить", "Needs another look")}</p><strong className="metric">{d.summary.needsRepeat}</strong><p>{d.summary.theoryRead} {t("тем отмечено прочитанными", "topics marked as read")}</p></div>
    </div>
    <section className="card progress-topics"><h2>{t("Прогресс по темам", "Topic progress")}</h2>
      <p className="muted">{t("Для каждой задачи учитывается последняя самостоятельная попытка в этой теме. Самопроверка не означает, что ответ правильный.", "Each task uses its latest independent attempt in that topic. A self-check does not mean the answer is correct.")}</p>
      {!courses.length && <Empty>{t("Ученик ещё не начал работу по темам.", "This student has not started any topics yet.")}</Empty>}
      {courses.map(courseId => { const topics = d.topics.filter(topic => topic.courseId === courseId); return <details key={courseId} open={courses.length === 1}>
        <summary>{topics[0].course} · {topics.length} {t("тем", "topics")}</summary>
        {topics.map(topic => <div className="item" key={topic.id}>
          <div className="row spread"><div><p className="eyebrow">{topic.chapter}</p><h3><Link href={`/courses/${topic.courseSlug}/topics/${topic.id}`}>{topic.title} →</Link></h3></div>
            <button className="secondary" onClick={() => { setLessonId(topic.id); setKind("PRACTICE"); setPage(1); }}>{t("Попытки по теме", "Topic attempts")}</button></div>
          <div className="row"><span>{topic.practised} {t("задач начато", "tasks tried")}</span><span>{topic.completed} {t("завершено", "finished")}</span><span>{topic.graded} {t("проверено", "graded")}</span></div>
          <p className="muted">{topic.withoutHelp} {t("на полный балл без предварительной помощи", "at full marks without prior help")} · {topic.selfChecked} {t("самопроверок", "self-checks")} · {topic.selfSolved} {t("решено по самооценке", "self-assessed as solved")} · {topic.needsRepeat} {t("нужно повторить", "need another look")}</p>
          {own && topic.totalTasks > 0 && <div className="topic-progress-meter"><label>{t("Практика: полный балл без помощи + решено по самооценке", "Practice: full marks without help + self-assessed solved")}: {topic.withoutHelp + topic.selfSolved} / {topic.totalTasks}<progress value={Math.min(topic.withoutHelp + topic.selfSolved, topic.totalTasks)} max={topic.totalTasks} /></label></div>}
          {topic.theoryRead && <span className="badge gray">{t("Теория отмечена прочитанной", "Theory marked as read")}</span>}
        </div>)}
      </details>; })}
    </section>
    <section className="card progress-history" aria-busy={r.isLoading}>
      <h2>{t("Попытки и ответы", "Attempts & answers")}</h2>
      <div className="field-grid">
        <label>{t("Вид работы", "Activity type")}<select value={kind} onChange={e => { setKind(e.target.value); setLessonId(""); setPage(1); }}>
          <option value="ALL">{t("Все", "All")}</option><option value="PRACTICE">{t("Самостоятельная практика", "Independent practice")}</option><option value="ASSIGNED">{t("Задания класса", "Class assignments")}</option>
        </select></label>
        <label>{t("Тема", "Topic")}<select value={lessonId} disabled={kind === "ASSIGNED"} onChange={e => { setLessonId(e.target.value); setPage(1); }}>
          <option value="">{t("Все темы и практика из банка", "All topics and problem-bank practice")}</option>
          {d.topics.map(topic => <option key={topic.id} value={topic.id}>{topic.course} · {topic.title}</option>)}
        </select></label>
      </div>
      {r.isLoading ? <Loading /> : <>
        {!d.attempts.length && <Empty>{t("По выбранным условиям попыток нет.", "No attempts match these filters.")}</Empty>}
        {d.attempts.map(a => <article className="item" key={a.id}>
          <div className="row spread"><div><div className="row"><Status value={a.kind} />{a.selfDirected ? <span className="badge gray">{a.needsRepeat ? t("Повторить", "Another look") : a.selfChecked ? t("Самопроверка", "Self-checked") : t("В работе", "In progress")}</span> : a.status === "EXPIRED" ? <span className="badge gray">{t("Время истекло", "Time ended")}</span> : <Status value={a.status} />}</div>
            <h3>{a.title}</h3>{a.topic && <p className="muted">{a.topic}</p>}
            <p className="muted"><DateLabel value={a.startedAt} /> · {t("Попытка", "Attempt")} {a.number}</p>
          </div>{a.canOpen ? <Link className="button secondary" href={own ? `/attempts/${a.id}` : `/teacher/classes/${classId}/students/${studentId}/attempts/${a.id}`}>{own ? a.status === "IN_PROGRESS" ? t("Продолжить", "Continue") : t("Мой ответ и результат", "My answer & result") : t("Ответы и проверка", "Answers & review")} →</Link> : <span className="muted">{a.selfDirected ? t("Самостоятельная работа на бумаге", "Independent work on paper") : t("Ответ ещё не сдан", "Not submitted yet")}</span>}</div>
          <div className="row"><strong>{a.selfDirected ? (a.selfPoints != null ? `${a.selfPoints} / ${a.maximum} · ${t("самооценка", "self-assessed")}` : a.selfSolved ? t("Решено по самооценке", "Self-assessed as solved") : t("Без самооценки баллов", "No self-awarded points")) : !a.resultVisible ? t("Результат ещё не опубликован", "Result not published yet") : a.score === null ? t("Без итоговой оценки", "Not fully graded") : `${a.score} / ${a.maximum}`}</strong>
            {!!a.files && <span>{a.files} {t("вложений", "attachments")}</span>}
            {a.helpUsed !== null && <span className="badge gray">{a.helpUsed ? t("Помощь использовалась", "Help used") : t("Помощь не раскрывалась", "No help revealed")}</span>}
            {a.selfChecked && <span className="badge gray">{t("Самопроверка", "Self-checked")}</span>}
            {a.needsRepeat && <span className="badge gold">{t("Нужно повторить", "Needs another look")}</span>}
          </div>
        </article>)}
        <nav className="row" aria-label={t("Страницы попыток", "Attempt pages")}><button className="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← {t("Назад", "Previous")}</button>
          <span>{page} / {d.pages} · {d.total} {t("попыток", "attempts")}</span><button className="secondary" disabled={page >= d.pages} onClick={() => setPage(p => p + 1)}>{t("Далее", "Next")} →</button></nav>
      </>}
    </section>
  </>;
}
