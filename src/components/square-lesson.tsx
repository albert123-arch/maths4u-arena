"use client";
import {ReportError} from "./report-error";
import { useView } from "./view-state";
/* eslint-disable react-hooks/set-state-in-effect -- Restore versioned drafts after authentication/hydration. */
import Link from "next/link";
import { Fragment, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, ButtonLink, Input } from "./controls";
import { ActorContext, api, ErrorNotice, Loading, MathContent, useLocale, useResource } from "./ui";
import { Feedback } from "./feedback";
import { QuestionSupport } from "./question-support";
import { MixedNumberInput } from "./mixed-number-input";
import { AdminArchiveLinks } from './admin-archive-links';
import type { SupportContent } from "@/lib/question-support-model";
import { LessonPresentations } from "./lesson-presentations";
import { ExtraStudyPractice, LessonStudy, StudyExampleList, StudyWrittenQuestions } from "./lesson-study";
import { StudyCheckpointReview, useStudyCheckpoints, type StudySessionState } from "./study-checkpoint-progress";
import { useSquareProgress, SquareSaveNotice } from "./square-progress";
import { firstStoredValue } from "@/lib/square-device-progress";
import { TeacherTaskPreview } from "./teacher-task-preview";
import type { TeacherTaskPreviewDto } from "@/lib/teacher-task-preview-model";
import { answerFormat, questionTitle } from "@/lib/square-presentation";
import { quadraticTopics, type QuadraticTopic, nextSquareReview, type SquareLesson, type SquareQuestion, type CheckResult, type CheckEvent } from "@/lib/square-model";

const sectionIds = ["notes", "examples", "practice", "challenge", "review"];
const collectionOrder = ["diagnostic", "short", "variant", "exam", "mixed"];

export function SquareLessonView({ lesson, sessionReady, studySession = "ready" }: { lesson: SquareLesson; sessionReady: boolean; studySession?: StudySessionState }) {
  const { t, lang } = useLocale(), root = useRef<HTMLDivElement>(null), sectionNav = useRef<HTMLElement>(null);
  const lens = useView();
  const study = lesson.study;
  const [activeNote, setActiveNote] = useState(study?.sections[0]?.id ?? "");
  const topic = lesson.topic, actor = useContext(ActorContext), state = useSquareProgress(sessionReady, topic);
  const checkpoints = useStudyCheckpoints(topic.lessonId, !!study && !lesson.draft, studySession);
  const teacher = actor?.roles.some(r => r.role === "TEACHER" || r.role === "ADMIN");
  const diagnostic = lesson.questions.find(q => q.collection === "diagnostic")??lesson.questions.find(q=>q.collection==="short")??lesson.questions[0], primary = lesson.questions.filter(q => q.collection === "short");
  const navigation:NonNullable<SquareLesson["navigation"]>=lesson.navigation??{directionPath:"/learn/a-level",directionTitle:"AS & A Level",coursePath:"/courses/maths4u-9709-p1",courseTitle:"Pure 1 · 9709",chapterTitle:"Quadratics",topics:quadraticTopics};
  const topicIndex = navigation.topics.findIndex(q => q.key === topic.key);
  const nextTopic = topicIndex >= 0 ? navigation.topics[topicIndex + 1] : undefined;
  const [uid, setUid] = useState(diagnostic.uid), [restored, setRestored] = useState(false), [active, setActive] = useState("notes");
  const queue = nextSquareReview(lesson.questions, state.snapshot), current = lesson.questions.find(q => q.uid === uid) ?? diagnostic;
  const examRoute = study?.examPractice;
  const exams = lesson.questions.filter(q => (q.collection === "exam" || q.collection === "mixed") && !q.variantIndex);
  const readyExams = exams.filter(q => !examRoute?.needs[q.family]);
  const mixedExams = exams.filter(q => examRoute?.needs[q.family]);
  const storageKey = topic.storage + ".resume." + (actor?.id ?? "guest") + "." + topic.version;
  const groups = collectionOrder.map(key => ({ key, questions: lesson.questions.filter(q => q.collection === key && (q.variantIndex===undefined||q.variantIndex===0||q.uid===uid)) })).filter(g => g.questions.length);
  const ordered = groups.flatMap(g => g.questions), group = groups.find(g => g.key === current.collection)!, index = ordered.findIndex(q => q.uid === current.uid);
  const collectionLabel = (key: string) => ({ diagnostic: t("Входная проверка", "Quick check"), short: t("Основная практика", "Core practice"), variant: t("Новые варианты", "Fresh variants"), exam: t("Экзаменационные задачи", "Exam-style"), mixed: t("Смешанная практика", "Mixed practice") })[key] ?? key;

  useEffect(() => {
    if (!sessionReady || !state.ready || restored) return;
    const params = new URLSearchParams(location.search), requested = params.get("item");
    let next = requested && lesson.questions.some(q => q.uid === requested) ? requested : params.get("review") && queue.length ? queue[0].uid : "";
    if (!next && !lens) { try { const stored = firstStoredValue(localStorage,[storageKey,...(topic.compatibleVersions??[]).map(v=>topic.storage+".resume."+(actor?.id??"guest")+"."+v)]); if (lesson.questions.some(q => q.uid === stored)) next = stored!; } catch { /* draft writer shows failure */ } }
    if (!next && state.snapshot.evidence.length) next = (queue[0] ?? primary.find(q => !state.snapshot.states[q.family]?.correct) ?? lesson.questions.find(q => q.collection === "mixed"))?.uid ?? "";
    if (next) { setUid(next); try { if (!lens) localStorage.setItem(storageKey, next); } catch { /* draft writer shows failure */ } } setRestored(true);
  }, [sessionReady, state.ready, restored, lesson.questions, queue, storageKey, primary, state.snapshot, lens, actor?.id, topic.compatibleVersions, topic.storage]);
  useEffect(() => { if (actor && sessionReady && !lens && !teacher) void api(topic.api + "/open", "POST").catch(() => {}); }, [actor?.id, sessionReady, topic.api, teacher]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".topbar"), nav = sectionNav.current, lessonRoot = root.current;
    if (!header || !nav || !lessonRoot) return;
    let frame = 0;
    function update() {
      frame = 0;
      const headerHeight = header!.getBoundingClientRect().height, navHeight = nav!.getBoundingClientRect().height;
      lessonRoot!.style.setProperty("--lesson-header-height", headerHeight + "px");
      lessonRoot!.style.setProperty("--lesson-nav-height", navHeight + "px");
      const boundary = headerHeight + navHeight + 24;
      let selected = "notes";
      for (const id of sectionIds) if ((document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= boundary) selected = id;
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) selected = "review";
      setActive(selected);
      if (study && selected === "notes") {
        let note = study.sections[0].id;
        for (const section of study.sections) {
          if ((document.getElementById(section.id)?.getBoundingClientRect().top ?? Infinity) <= boundary) note = section.id;
        }
        setActiveNote(note);
      }
      const link = nav!.querySelector<HTMLAnchorElement>('[href="#' + selected + '"]');
      if (link && link.offsetLeft < nav!.scrollLeft) nav!.scrollLeft = link.offsetLeft;
      else if (link && link.offsetLeft + link.offsetWidth > nav!.scrollLeft + nav!.clientWidth) nav!.scrollLeft = link.offsetLeft + link.offsetWidth - nav!.clientWidth;
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    const observer = new ResizeObserver(schedule); observer.observe(header); observer.observe(nav);
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule); update();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [study]);
  useEffect(() => {
    const lessonRoot = root.current;
    if (!lessonRoot) return;
    const selectors = ".katex-display, .math-content, .stem-leaf-scroll, .table-scroll";
    let frame = 0;
    let active = true;
    function update() {
      frame = 0;
      const containers = Array.from(lessonRoot!.querySelectorAll<HTMLElement>(selectors));
      const overflowing = containers.map(element => element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1);
      containers.forEach((element, index) => {
        const managed = element.hasAttribute("data-math-scroll");
        if (overflowing[index] && (managed || !element.hasAttribute("tabindex"))) {
          element.tabIndex = 0;
          element.setAttribute("data-math-scroll", "");
          element.setAttribute("role", "group");
          const label = element.classList.contains("katex-display")
            ? (lang === "ru" ? "Прокручиваемая формула" : "Scrollable equation")
            : (lang === "ru" ? "Прокручиваемый материал" : "Scrollable maths content");
          element.setAttribute("aria-label", label);
        } else if (!overflowing[index] && managed) {
          for (const attribute of ["tabindex", "role", "aria-label", "data-math-scroll"]) element.removeAttribute(attribute);
        }
      });
    }
    function schedule() {
      if (active && !frame) frame = requestAnimationFrame(update);
    }
    const resize = new ResizeObserver(schedule);
    resize.observe(lessonRoot);
    const changes = new MutationObserver(schedule);
    changes.observe(lessonRoot, { subtree: true, childList: true, attributes: true, attributeFilter: ["open", "hidden", "data-pending"] });
    void document.fonts.ready.then(schedule);
    schedule();
    return () => {
      active = false;
      resize.disconnect();
      changes.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [lang]);

  function choose(q: SquareQuestion) {
    setUid(q.uid);
    try { if (!lens) localStorage.setItem(storageKey, q.uid); } catch { /* draft writer shows failure */ }
    const url = new URL(location.href); url.searchParams.set("item", q.uid); url.hash = "practice";
    history.replaceState(history.state, "", url);
    document.getElementById("practice")?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  const examVariants=current.variantIndex!==undefined?lesson.questions.filter(q=>q.family===current.family):[];
  const lastPreparedS1Variant=topic.packageKey?.startsWith("9709-s1-")&&current.variantIndex===3;
  const checked = group.questions.filter(q => state.snapshot.seen[q.uid]).length;
  const nextExam = examRoute ? readyExams[0] : lesson.questions.find(q => q.collection === "mixed" || q.collection === "exam");
  const next = primary.find(q => !state.snapshot.states[q.family]?.correct) ?? nextExam ?? (examRoute?.starters.length ? undefined : primary[0]);
  const markRead = actor && !teacher && <Button disabled={!!lens || !state.ready || !!state.snapshot.notesRead} onClick={() => void state.markRead()}>{state.snapshot.notesRead ? t("✓ Конспект прочитан", "✓ Notes marked as read") : t("Отметить прочитанным", "Mark notes as read")}</Button>;
  return <div className="square-lesson" ref={root} data-structured-notes={study ? "" : undefined}>
    {lesson.draft&&<p className="muted">{t("Не опубликовано · предпросмотр администратора","Unpublished · administrator preview")}</p>}
    <nav className="square-crumbs" aria-label={t("Путь", "Breadcrumb")}><Link href={navigation.directionPath}>{navigation.directionTitle}</Link><span> / </span><Link href={navigation.coursePath}>{navigation.courseTitle}</Link><span> / </span>{navigation.chapterPath?<Link href={navigation.chapterPath}>{navigation.chapterTitle}</Link>:<span>{navigation.chapterTitle}</span>}</nav>
    <header className="square-heading"><h1>{topic.title}</h1>
      {lesson.summaryHtml ? <p dangerouslySetInnerHTML={{ __html: lesson.summaryHtml }} /> : <p>{topic.summary}</p>}
      <ButtonLink variant="text" href="#practice">{t("Начать с короткой проверки →", "Try the quick check →")}</ButtonLink>{!lesson.draft&&<span className="muted">{t("Без регистрации", "No account needed")}</span>}{teacher&&!lesson.draft && <ButtonLink href={"/teacher/works/new?topic=" + topic.lessonId}>{t("Задание из темы", "Assign from this topic")} →</ButtonLink>}</header>
    <details className="square-topic-mobile"><summary>{navigation.chapterTitle} · {topicIndex + 1} {t("из", "of")} {navigation.topics.length}<span aria-hidden="true">▾</span></summary><nav aria-label={t("Выбрать тему главы", "Choose a chapter topic")}>{navigation.topics.map(q => <Link key={q.key} href={q.path} aria-current={q.key === topic.key ? "page" : undefined}>{q.title}</Link>)}</nav></details>
    <nav className="quadratics-topics" aria-label={t("Темы главы", "Chapter topics")}>{navigation.topics.map(q => <Link key={q.key} href={q.path} aria-current={q.key === topic.key ? "page" : undefined}>{q.title}</Link>)}</nav>
    <nav className="square-nav" ref={sectionNav} aria-label={t("Разделы урока", "Lesson sections")}>{[t("Конспект", "Notes"), t("Примеры", "Examples"), t("Практика", "Practice"), t("Задачи", "Exam-style"), t("Повторение", "Review")].map((label, i) => <a key={sectionIds[i]} href={"#" + sectionIds[i]} aria-current={active === sectionIds[i] ? "location" : undefined}>{label}</a>)}</nav>
    {study
      ? <LessonStudy lesson={lesson} study={study} activeId={activeNote} checkpoints={checkpoints.checks} onCheckpoint={checkpoints.record} session={studySession}>{markRead}</LessonStudy>
      : <section className="card square-reading" id="notes"><MathContent html={lesson.notes} />{markRead}</section>}
    <section className="card square-reading" id="examples"><h2>{t("Разобранные примеры", "Worked examples")}</h2>{study ? <StudyExampleList study={study} examples={lesson.examples} /> : lesson.examples.map(e => <article className="square-example" key={e.title}><h3>{e.title}</h3><MathContent html={e.question} /><details><summary>{t("Посмотреть решение", "Follow the solution")}</summary><MathContent html={e.solution} /></details></article>)}</section>
    <section id="practice" className="card square-practice"><h2>{t("Практика метода", "Practise the method")}</h2>
      <div className="square-question-nav" aria-label={t("Навигация по вопросам", "Question navigation")}>
        <div className="row spread"><div><span className="square-collection">{collectionLabel(current.collection)}</span><p className="square-question-position" aria-live="polite">{t("Вопрос", "Question")} {group.questions.findIndex(q => q.uid === uid) + 1} {t("из", "of")} {group.questions.length}</p></div><div className="row"><Button disabled={index === 0} onClick={() => choose(ordered[index - 1])}>{t("← Назад", "← Previous")}</Button><Button disabled={index === ordered.length - 1} onClick={() => choose(ordered[index + 1])}>{t("Далее →", "Next →")}</Button></div></div>
        {(!teacher || lens) && <><progress max={group.questions.length} value={checked} aria-label={t("Проверено в этой подборке", "Questions checked in this collection")} /><p className="square-progress-label">{checked} / {group.questions.length} {t("проверено в этой подборке", "checked in this collection")}</p></>}
        <details className="square-question-list"><summary>{t("Все вопросы", "Question list")}</summary>{groups.map(g => <div key={g.key}><h3>{collectionLabel(g.key)}</h3><ol>{g.questions.map((q, i) => <li key={q.uid}><Button variant="text" aria-current={q.uid === uid ? "step" : undefined} onClick={e => { const disclosure = e.currentTarget.closest("details"); if (disclosure) { disclosure.open = false; disclosure.querySelector("summary")?.focus({ preventScroll: true }); } choose(q); }}><span>{i + 1}. {questionTitle(q)}</span>{!!state.snapshot.seen[q.uid] && <span className="square-list-checked">{t("Проверено", "Checked")}</span>}</Button></li>)}</ol></div>)}</details>
      </div>
    {examVariants.length>1&&<div className="row spread"><p>Same skill, fresh numbers · {current.variantIndex===0?"Main question":"Variant "+current.variantIndex}</p>{lastPreparedS1Variant?<p>This is the last prepared variant. Review your method or choose another question.</p>:<Button onClick={()=>choose(examVariants.find(q=>q.variantIndex===((current.variantIndex??0)+1)%4)!)}>Try a fresh version of this question →</Button>}</div>}
      {examRoute?.needs[current.family] && <ExamPrerequisites lesson={lesson} family={current.family} />}
      {teacher && !lens ? <TeacherLessonQuestion key={uid} topic={topic} q={current} /> : <SquareQuestionForm reportReady={restored && sessionReady} topic={topic} key={uid + (actor?.id ?? "guest")} q={current} enabled={restored && sessionReady && state.ready && !state.error && lens?.mode !== "USER"} onResult={async (event, result) => { await state.record(event, current.family, result); }} />}
      <div className="square-next row">{next ? <Button onClick={() => choose(next)}>{t("Следующий шаг →", "Next step →")}</Button> : <ButtonLink href="#challenge">{t("Экзаменационная практика →", "Try exam-style practice →")}</ButtonLink>}{current.variantIndex===undefined && lesson.questions.some(q => q.family === current.family && q.uid !== current.uid) && <Button onClick={() => choose(lesson.questions.filter(q => q.family === current.family && q.uid !== current.uid).sort((a, b) => (state.snapshot.seen[a.uid] ?? 0) - (state.snapshot.seen[b.uid] ?? 0))[0])}>{t("Новый вариант", "Try a fresh variant")}</Button>}<a href="#examples">{t("Повторить метод", "Review the method")}</a></div>
      {(!teacher || lens) && <SquareSaveNotice state={state} />}
      {study?.extraPractice && <ExtraStudyPractice checks={study.extraPractice} lessonId={topic.lessonId} onCheckpoint={checkpoints.record} session={studySession} />}
      {!!study?.previousChecks?.length && <ExtraStudyPractice label="Previous checkpoints" checks={study.previousChecks} lessonId={topic.lessonId} onCheckpoint={checkpoints.record} session={studySession} />}
    </section>
    <section id="challenge" className="card">
      <h2>{t("Примените метод · авторские экзаменационные задачи", "Apply it · original exam-style problems")}</h2>
      <p>{t("Запишите решение на бумаге и сравните его с разбором и критериями.", "Show your working on paper and compare it with the worked solution and marking guidance.")}</p>
      {examRoute && <h3>Start after this lesson</h3>}
      {examRoute?.starters.length ? <StudyWrittenQuestions questions={examRoute.starters} /> : null}
      {readyExams.length > 0 && <div className="square-challenges">{readyExams.map(q =>
        <Button key={q.uid} onClick={() => choose(q)}><strong>{questionTitle(q)}</strong><span>{q.marks} {t("баллов за письменное решение →", "written marks →")}</span></Button>
      )}</div>}
      {mixedExams.length > 0 && <details className="exam-mixed">
        <summary>Mixed chapter practice</summary>
        <p>Try these after completing this chapter.</p>
        <div className="square-challenges">{mixedExams.map(q => <div key={q.uid}>
          <Button onClick={() => choose(q)}><strong>{questionTitle(q)}</strong><span>{q.marks} written marks →</span></Button>
          <ExamPrerequisites lesson={lesson} family={q.family} />
        </div>)}</div>
      </details>}
    </section>
    <section id="review" className="card"><h2>{t("Вернитесь к тому, что требует практики", "Come back to what needs practice")}</h2>{study && <><ButtonLink href={topic.path + "?view=revision"}>Quick revision sheet (A4)</ButtonLink><StudyCheckpointReview study={study} checks={checkpoints.checks} /></>}
      {study && studySession === "device" && <p role="status">Account status is temporarily unavailable. New checkpoints are saved on this device.</p>}
      {checkpoints.issue && <p role="alert">Your checkpoint history is unavailable. You can still check answers.</p>}
      {!Object.keys(state.snapshot.states).length && !Object.keys(checkpoints.checks).length ? <p>{t("План повторения появится после первой проверки.", "Your review plan starts after your first check.")}</p> : <><p>{queue.length ? t("Навыков для повторения сейчас: " + queue.length + ".", queue.length + (queue.length === 1 ? " skill is" : " skills are") + " ready for review.") : t("Нет заданий из практики для повторения сейчас.", "No practice variants are due now.")}</p>{queue.length > 0 && <Button onClick={() => choose(queue[0])}>{t("Повторить на новом варианте →", "Review with a fresh variant →")}</Button>}{Object.keys(state.snapshot.states).length > 0 && <p className="muted">{t("После верного ответа без помощи: через 1, 3, 7 и 14 дней. Повторы в тот же день не увеличивают интервал. Ошибки возвращаются сегодня; ответы с помощью — раньше.", "After a correct answer without help: 1, 3, 7, then 14 days. Same-day retries do not advance the interval. Mistakes return today; answers with help return sooner.")}</p>}</>}</section>
    <nav className="row square-chapter-next" aria-label={t("Продолжить изучение главы", "Continue this chapter")}>
      {nextTopic
        ? <ButtonLink href={nextTopic.path}>{t("Следующий урок", "Next lesson")} · {nextTopic.title} →</ButtonLink>
        : <ButtonLink href={navigation.chapterPath ?? navigation.coursePath}>{navigation.chapterPath ? t("Вернуться к главе", "Back to chapter") : t("Вернуться к курсу", "Back to course")}</ButtonLink>}
    </nav>
    {topic.packageKey==="9709-p1-quadratics"&&<p><Link href={topic.path+"?practice=previous"}>Earlier practice and saved answers</Link></p>}
    {["9709-p1-functions","9709-p1-coordinate-geometry","9709-p1-circular-measure","9709-p1-trigonometry","9709-p1-series","9709-p1-binomial-expansion","9709-p1-differentiation","9709-p1-integration","9709-s1-representation","9709-s1-central-tendency","9709-s1-variation","9709-s1-probability","9709-s1-counting","9709-s1-distributions","9709-s1-binomial-geometric","9709-s1-normal"].includes(topic.packageKey??"")&&<p><Link href={topic.path+"?view=legacy"}>Question bank and saved work</Link></p>}
    {teacher && <LessonPresentations lessonId={topic.lessonId} />}
    {!topic.packageKey&&<details className="square-source"><summary>{t("Об этих материалах и сохранённой работе", "About these materials and your existing work")}</summary><p>{t("Задачи взяты из авторской коллекции Maths4U Quadratics. В этом уроке нет экзаменационных вопросов или рисунков Cambridge.", "Questions come from the independently authored Maths4U Quadratics collection. No Cambridge examination questions or graphics are included in this lesson.")}</p><p><Link href={topic.path + "?view=legacy"}>{t("Прежние конспекты, банк и попытки", "Earlier notes, bank and saved attempts")}</Link> · <Link href="/student/progress">{t("Прогресс класса и прежние ответы", "Class progress and previous answers")}</Link></p></details>}
  </div>;
}

function ExamPrerequisites({ lesson, family }: { lesson: SquareLesson; family: string }) {
  const links = (lesson.study?.examPractice?.needs[family] ?? []).flatMap(target => {
    const [key, section] = target.split("#");
    const topic = lesson.navigation?.topics.find(item => item.key === key);
    if (!topic) return [];
    const title = section === "find-tangents-from-an-external-point" ? "Two tangents from a point" : topic.title;
    return [{ href: topic.path + (section ? "#" + section : ""), title }];
  });
  if (!links.length) return null;
  return <p className="exam-prerequisites muted">Review {links.map((link, i) => <Fragment key={link.href}>
    {i > 0 && (i === links.length - 1 ? " and " : ", ")}<Link href={link.href}>{link.title}</Link>
  </Fragment>)} first.</p>;
}

function TeacherLessonQuestion({ topic, q }: { topic: QuadraticTopic; q: SquareQuestion }) {
  const query = new URLSearchParams({ lessonId: topic.lessonId, uid: q.uid, version: topic.version, lang: "en" });
  const r = useResource<TeacherTaskPreviewDto>("teacher/package-task-preview?" + query);
  return <article className="square-question"><div className="row spread"><h3>{questionTitle(q)}</h3><span className="badge">{q.marks} {q.marks === 1 ? "mark" : "marks"}</span></div><ErrorNotice error={r.error}/>{r.data ? <TeacherTaskPreview taskId={r.data.taskId} version={r.data.question} initial={r.data}/> : !r.error && <Loading/>}</article>;
}

function SquareQuestionForm({ q, enabled, onResult, topic, reportReady }: { reportReady:boolean; topic: QuadraticTopic; q: SquareQuestion; enabled: boolean; onResult: (event: CheckEvent, result: CheckResult) => Promise<void> }) {
  const lens = useView();
  const { t } = useLocale(), actor = useContext(ActorContext), form = useRef<HTMLFormElement>(null);
  const pendingFocus = useRef<HTMLElement | null>(null);
  const [attempted, setAttempted] = useState(false), [paper, setPaper] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({}), [helpUsed, setHelpUsed] = useState(false), [result, setResult] = useState<CheckResult | null>(null), [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false), [storageIssue, setStorageIssue] = useState(false);
  const draftKey = topic.storage + ".draft." + (actor?.id ?? "guest") + "." + topic.version + "." + q.uid;
  // An older answer and self-assessment belong to their original wording.
  const compatibleDraftVersions = topic.revisedQuestions?.includes(q.uid) ? undefined : topic.compatibleVersions;
  // Restore after React has re-enabled the controls, rather than racing that commit.
  useLayoutEffect(() => {
    if (busy || !pendingFocus.current) return;
    const focused = pendingFocus.current; pendingFocus.current = null;
    if (focused.isConnected && form.current?.contains(focused) && (document.activeElement === document.body || document.activeElement === focused)) focused.focus({ preventScroll: true });
  });
  useEffect(() => {
    if (!enabled || lens) return;
    try {
      const d = JSON.parse(firstStoredValue(localStorage,[draftKey,...(compatibleDraftVersions??[]).map(v=>topic.storage+".draft."+(actor?.id??"guest")+"."+v+"."+q.uid)]) ?? "null");
      if (d && typeof d.answers === "object" && !(Number.isFinite(d.checkedAt) && Date.now() - d.checkedAt >= 86400000)) {
        setAnswers(Object.fromEntries(q.fields.map(f => [f.key, typeof d.answers[f.key] === "string" ? d.answers[f.key].slice(0, 400) : ""]))); setHelpUsed(d.helpUsed === true); setAttempted(d.attempted === true || Number.isFinite(d.checkedAt));
      }
    } catch { setStorageIssue(true); }
  }, [enabled, draftKey, q.fields, lens, actor?.id, q.uid, compatibleDraftVersions, topic.storage]);
  function save(values: Record<string, string>, used: boolean, checkedAt?: number, didAttempt = attempted) { if (lens) return; try { localStorage.setItem(draftKey, JSON.stringify({ answers: values, helpUsed: used, checkedAt, attempted: didAttempt })); } catch { setStorageIssue(true); } }
  function change(k: string, value: string) { const next = { ...answers, [k]: value }; setAnswers(next); setResult(null); save(next, helpUsed); }
  function preserveFocus() {
    const focused = document.activeElement;
    return () => { pendingFocus.current = focused instanceof HTMLElement ? focused : null; };
  }
  return <article className="square-question"><div className="row spread"><h3>{questionTitle(q)}</h3><span className="badge">{q.marks} {q.marks === 1 ? t("балл", "mark") : t("баллов", "marks")}</span></div><AdminArchiveLinks uid={q.uid}/><MathContent html={q.prompt} />
    {q.fields.some(f => /^(a|form_a)$/.test(f.key)) && <p className="square-template">{t("Введите полную форму во всех трёх полях:", "Enter the complete form using all three fields:")} <strong>{q.fields.some(f => f.key === "form_a") ? "A(x − H)² + C" : "a(x − h)² + c"}</strong>.</p>}
    {q.fields.length>0&&<form ref={form} onSubmit={async e => {
      e.preventDefault(); const restoreFocus = preserveFocus(); setBusy(true); setError(null); setAttempted(true); save(answers, helpUsed, undefined, true);
      const event = { eventKey: crypto.randomUUID(), uid: q.uid, answers, helpUsed, at: Date.now() };
      try { const r = await api<CheckResult>(topic.api + "/check", "POST", { ...event, version: topic.version }); setResult(r); if (r.valid) { save(answers, helpUsed, event.at, true); await onResult(event, r); } } catch (err) { setError(err); } finally { setBusy(false); restoreFocus(); }
    }}>
      <div className="square-answer-grid">{q.fields.map(f => {
        const field = result?.fields[f.key], format = answerFormat(f), invalid = field && !field.correct, feedbackId = "feedback-" + f.key, helpId = "format-" + f.key;
        return <div className="square-answer" key={f.key}>
          {f.type === "choice" ? <fieldset aria-invalid={invalid || undefined} aria-describedby={helpId + " " + feedbackId}><legend>{f.label}</legend>{Object.entries(f.options ?? {}).map(([key, html]) => <label className="square-choice" data-state={answers[f.key] === key && field ? field.correct ? "correct" : "again" : undefined} key={key}><Input type="radio" name={f.key} value={key} aria-invalid={answers[f.key] === key && invalid || undefined} aria-describedby={helpId + " " + feedbackId} checked={answers[f.key] === key} onChange={() => change(f.key, key)} required disabled={!enabled || busy} /><MathContent html={html} />{answers[f.key] === key && field && <span className="square-choice-status" aria-label={field.correct ? t("Верно", "Correct") : t("Попробуйте ещё", "Look again")}>{field.correct ? "✓" : "↻"}</span>}</label>)}</fieldset> : f.mixedNumber ?
            <MixedNumberInput label={f.label} labels={[t("Целая часть", "Whole number"), t("Числитель", "Numerator"), t("Знаменатель", "Denominator")]}
              value={answers[f.key] ?? ""} describedBy={helpId + " " + feedbackId} invalid={invalid || undefined}
              disabled={!enabled || busy} onChange={value => change(f.key, value)} /> :
            <label>{f.label}<Input name={f.key} aria-invalid={invalid || undefined} aria-describedby={helpId + " " + feedbackId} value={answers[f.key] ?? ""} onChange={e => change(f.key, e.target.value)} maxLength={400} required autoComplete="off" spellCheck={false} disabled={!enabled || busy} placeholder={format.placeholder} /></label>}
          <div className="square-field-status"><p className="square-field-format" id={helpId}>{t(format.ru, format.en)}</p><div id={feedbackId}>{field && <Feedback compact kind={field.correct ? "correct" : field.formatError ? "format" : "again"}>{!field.correct && (field.formatError ? t("Используйте формат, указанный под этим полем.", "Use the answer format shown under this field.") : field.message)}</Feedback>}</div></div>
        </div>;
      })}</div>
      {q.fields.some(f => f.type !== "choice") && <details className="square-format"><summary>{t("Полная справка по вводу ответов", "Full answer-format guide")}</summary><p>{t("Точные числа: 3/2, sqrt(5), 2-sqrt(3), pi/6, 3*pi/2. Множества: {1,4}. Интервалы: (3,5]; круглая скобка исключает границу. Бесконечность: inf, объединение: U, нет решений: empty. Пары и тройки координат разделяйте точкой с запятой. Выражения: 2x^2+3x-1; уравнения: x^2=3x+1 или многочлен, равный нулю. Множители: x-1 ; x+2. Дробь с параметром: числитель ; знаменатель. Целые числа перечисляйте списком.", "Exact numbers: 3/2, sqrt(5), 2-sqrt(3), pi/6, 3*pi/2. Sets: {1,4}. Intervals: (3,5]; a round bracket excludes the endpoint. Infinity: inf; union: U; no solutions: empty. Separate coordinate pairs or triples with semicolons. Expressions: 2x^2+3x-1; equations: x^2=3x+1 or the polynomial equal to zero. Factors: x-1 ; x+2. Parameter fraction: numerator ; denominator. List integer answers individually.")}</p></details>}
      <div className="row square-form-actions"><Button variant="primary" type="submit" disabled={!enabled || busy || paper}>{busy ? t("Проверка…", "Checking…") : t("Проверить ответ", "Check answer")}</Button></div>
    </form>}
    <ErrorNotice error={error} />
    <div className="square-result">{result && <Feedback kind={result.correct ? "correct" : result.valid ? "again" : "format"}>{result.correct ? t("Все итоговые ответы верны.", "All final answers are correct.") + (helpUsed ? t(" Теперь попробуйте новый вариант без помощи.", " Now try a fresh variant without help.") : t(" Переходите дальше или вернитесь позже для повторения.", " Try the next step or return later for review.")) : result.valid ? t("Проверьте поля с отметкой «Попробуйте ещё».", "Look at the fields marked ‘Look again’, then try again.") : t("Некоторые ответы не удалось прочитать. Проверьте формат в отмеченных полях; результат ещё не записан.", "Some answers could not be read. Check the marked fields; no result has been recorded yet.")}</Feedback>}</div>
    {q.manual && <p className="muted">{q.fields.length?t("Проверяются только итоговые ответы. Сравните объяснение, рисунок и метод с разобранным решением; баллы за метод требуют проверки.", "The checker checks final answers only. Compare your explanation, sketch and method with the worked solution; method marks need review."):t("Решите задачу на бумаге, затем сравните работу с решением и критериями.", "Solve the complete problem on paper, then compare your working with the solution and marking guidance.")}</p>}
    <QuestionSupport storageKey={draftKey+'.support'} compatibleStorageKeys={(compatibleDraftVersions??[]).map(v=>topic.storage+".draft."+(actor?.id??"guest")+"."+v+"."+q.uid+".support")} manual={q.manual} maximum={q.marks} enabled={enabled} attempted={attempted} onPaperFinished={()=>setPaper(true)} onHelp={()=>{setHelpUsed(true);save(answers,true);}} request={(kind,access)=>api<SupportContent>(topic.api+'/help','POST',{uid:q.uid,kind,version:topic.version,...(access?{access}:{}),...(access==='attempt'?{answers}:{})})} assess={actor&&!lens?points=>api(topic.api+'/self-assess','POST',{uid:q.uid,version:topic.version,points}):undefined}/>
    <ReportError disabled={!reportReady} source={{topic:topic.key,uid:q.uid,version:topic.version}}/>
    {storageIssue && <p role="alert">{t("Не удалось сохранить черновик в браузере. Не закрывайте страницу до окончания работы.", "This draft could not be saved in your browser. Keep the page open until you finish.")}</p>}
  </article>;
}
