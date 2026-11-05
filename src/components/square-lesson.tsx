"use client";
/* eslint-disable react-hooks/set-state-in-effect -- Restore versioned drafts after authentication/hydration. */
import Link from "next/link";
import { useContext, useEffect, useRef, useState } from "react";
import { Button, ButtonLink, Input } from "./controls";
import { ActorContext, api, ErrorNotice, MathContent, useLocale } from "./ui";
import { Feedback } from "./feedback";
import { LessonPresentations } from "./lesson-presentations";
import { useSquareProgress, SquareSaveNotice } from "./square-progress";
import { answerFormat, questionTitle } from "@/lib/square-presentation";
import { quadraticTopics, type QuadraticTopic, nextSquareReview, type SquareLesson, type SquareQuestion, type CheckResult, type CheckEvent } from "@/lib/square-model";

const sectionIds = ["notes", "examples", "practice", "challenge", "review"];
const collectionOrder = ["diagnostic", "short", "variant", "exam", "mixed"];

export function SquareLessonView({ lesson, sessionReady }: { lesson: SquareLesson; sessionReady: boolean }) {
  const { t } = useLocale(), root = useRef<HTMLDivElement>(null), sectionNav = useRef<HTMLElement>(null);
  const topic = lesson.topic, actor = useContext(ActorContext), state = useSquareProgress(sessionReady, topic);
  const diagnostic = lesson.questions.find(q => q.collection === "diagnostic")!, primary = lesson.questions.filter(q => q.collection === "short");
  const [uid, setUid] = useState(diagnostic.uid), [restored, setRestored] = useState(false), [active, setActive] = useState("notes");
  const queue = nextSquareReview(lesson.questions, state.snapshot), current = lesson.questions.find(q => q.uid === uid) ?? diagnostic;
  const storageKey = topic.storage + ".resume." + (actor?.id ?? "guest") + "." + topic.version;
  const groups = collectionOrder.map(key => ({ key, questions: lesson.questions.filter(q => q.collection === key) })).filter(g => g.questions.length);
  const ordered = groups.flatMap(g => g.questions), group = groups.find(g => g.key === current.collection)!, index = ordered.findIndex(q => q.uid === current.uid);
  const collectionLabel = (key: string) => ({ diagnostic: t("Входная проверка", "Quick check"), short: t("Основная практика", "Core practice"), variant: t("Новые варианты", "Fresh variants"), exam: t("Экзаменационные задачи", "Exam-style"), mixed: t("Смешанная практика", "Mixed practice") })[key] ?? key;

  useEffect(() => {
    if (!sessionReady || !state.ready || restored) return;
    const params = new URLSearchParams(location.search), requested = params.get("item");
    let next = requested && lesson.questions.some(q => q.uid === requested) ? requested : params.get("review") && queue.length ? queue[0].uid : "";
    if (!next) { try { const stored = localStorage.getItem(storageKey); if (lesson.questions.some(q => q.uid === stored)) next = stored!; } catch { /* draft writer shows failure */ } }
    if (!next && state.snapshot.evidence.length) next = (queue[0] ?? primary.find(q => !state.snapshot.states[q.family]?.correct) ?? lesson.questions.find(q => q.collection === "mixed"))?.uid ?? "";
    if (next) { setUid(next); try { localStorage.setItem(storageKey, next); } catch { /* draft writer shows failure */ } } setRestored(true);
  }, [sessionReady, state.ready, restored, lesson.questions, queue, storageKey, primary, state.snapshot]);
  useEffect(() => { if (actor && sessionReady) void api(topic.api + "/open", "POST").catch(() => {}); }, [actor?.id, sessionReady, topic.api]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const link = nav!.querySelector<HTMLAnchorElement>('[href="#' + selected + '"]');
      if (link && link.offsetLeft < nav!.scrollLeft) nav!.scrollLeft = link.offsetLeft;
      else if (link && link.offsetLeft + link.offsetWidth > nav!.scrollLeft + nav!.clientWidth) nav!.scrollLeft = link.offsetLeft + link.offsetWidth - nav!.clientWidth;
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    const observer = new ResizeObserver(schedule); observer.observe(header); observer.observe(nav);
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule); update();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, []);
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>(".katex-display").forEach(formula => {
      formula.tabIndex = 0;
      formula.setAttribute("role", "region");
      formula.setAttribute("aria-label", t("Формула; длинную формулу можно прокрутить по горизонтали", "Formula; scroll horizontally to read a long expression"));
    });
  }, [lesson, uid, t]);

  function choose(q: SquareQuestion) {
    setUid(q.uid);
    try { localStorage.setItem(storageKey, q.uid); } catch { /* draft writer shows failure */ }
    const url = new URL(location.href); url.searchParams.set("item", q.uid); url.hash = "practice";
    history.replaceState(history.state, "", url);
    document.getElementById("practice")?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  const teacher = actor?.roles.some(r => r.role === "TEACHER" || r.role === "ADMIN");
  const completed = primary.filter(q => state.snapshot.states[q.family]?.correct && !state.snapshot.states[q.family]?.helpUsed).length;
  const checked = group.questions.filter(q => state.snapshot.seen[q.uid]).length;
  const next = primary.find(q => !state.snapshot.states[q.family]?.correct) ?? lesson.questions.find(q => q.collection === "mixed")!;
  return <div className="square-lesson" ref={root}>
    <nav className="square-crumbs" aria-label={t("Путь", "Breadcrumb")}><Link href="/learn/a-level">AS & A Level</Link><span> / </span><Link href="/courses/maths4u-9709-p1">Pure 1 · 9709</Link><span> / Quadratics</span></nav>
    <header className="square-heading"><h1>{topic.title}</h1><p>{topic.summary}</p><ButtonLink variant="text" href="#practice">{t("Начать с короткой проверки →", "Try the quick check →")}</ButtonLink><span className="muted">{t("Без регистрации", "No account needed")}</span></header>
    <details className="square-topic-mobile"><summary>Quadratics · {quadraticTopics.findIndex(q => q.key === topic.key) + 1} {t("из", "of")} {quadraticTopics.length}<span aria-hidden="true">▾</span></summary><nav aria-label={t("Выбрать тему Quadratics", "Choose a Quadratics topic")}>{quadraticTopics.map(q => <Link key={q.key} href={q.path} aria-current={q.key === topic.key ? "page" : undefined}>{q.title}</Link>)}</nav></details>
    <nav className="quadratics-topics" aria-label={t("Темы Quadratics", "Quadratics topics")}>{quadraticTopics.map(q => <Link key={q.key} href={q.path} aria-current={q.key === topic.key ? "page" : undefined}>{q.title}</Link>)}</nav>
    <nav className="square-nav" ref={sectionNav} aria-label={t("Разделы урока", "Lesson sections")}>{[t("Конспект", "Notes"), t("Примеры", "Examples"), t("Практика", "Practice"), t("Задачи", "Exam-style"), t("Повторение", "Review")].map((label, i) => <a key={sectionIds[i]} href={"#" + sectionIds[i]} aria-current={active === sectionIds[i] ? "location" : undefined}>{label}</a>)}</nav>
    <section className="card square-reading" id="notes"><MathContent html={lesson.notes} />{actor && <Button disabled={!state.ready || !!state.snapshot.notesRead} onClick={() => void state.markRead()}>{state.snapshot.notesRead ? t("✓ Конспект прочитан", "✓ Notes marked as read") : t("Отметить прочитанным", "Mark notes as read")}</Button>}</section>
    <section className="card square-reading" id="examples"><h2>{t("Разобранные примеры", "Worked examples")}</h2>{lesson.examples.map(e => <article className="square-example" key={e.title}><h3>{e.title}</h3><MathContent html={e.question} /><details><summary>{t("Посмотреть решение", "Follow the solution")}</summary><MathContent html={e.solution} /></details></article>)}</section>
    <section id="practice" className="card square-practice"><div className="row spread"><h2>{t("Практика метода", "Practise the method")}</h2><span className="muted">{completed} / {primary.length} {t("решено без помощи", "correct without help")}</span></div>
      <div className="square-question-nav" aria-label={t("Навигация по вопросам", "Question navigation")}>
        <div className="row spread"><div><span className="square-collection">{collectionLabel(current.collection)}</span><p className="square-question-position" aria-live="polite">{t("Вопрос", "Question")} {group.questions.findIndex(q => q.uid === uid) + 1} {t("из", "of")} {group.questions.length}</p></div><div className="row"><Button disabled={index === 0} onClick={() => choose(ordered[index - 1])}>{t("← Назад", "← Previous")}</Button><Button disabled={index === ordered.length - 1} onClick={() => choose(ordered[index + 1])}>{t("Далее →", "Next →")}</Button></div></div>
        <progress max={group.questions.length} value={checked} aria-label={t("Проверено в этой подборке", "Questions checked in this collection")} /><p className="square-progress-label">{checked} / {group.questions.length} {t("проверено в этой подборке", "checked in this collection")}</p>
        <details className="square-question-list"><summary>{t("Все вопросы", "Question list")}</summary>{groups.map(g => <div key={g.key}><h3>{collectionLabel(g.key)}</h3><ol>{g.questions.map((q, i) => <li key={q.uid}><Button variant="text" aria-current={q.uid === uid ? "step" : undefined} onClick={e => { const disclosure = e.currentTarget.closest("details"); if (disclosure) { disclosure.open = false; disclosure.querySelector("summary")?.focus({ preventScroll: true }); } choose(q); }}><span>{i + 1}. {questionTitle(q)}</span>{!!state.snapshot.seen[q.uid] && <span className="square-list-checked">{t("Проверено", "Checked")}</span>}</Button></li>)}</ol></div>)}</details>
      </div>
      <SquareQuestionForm topic={topic} key={uid + (actor?.id ?? "guest")} q={current} enabled={sessionReady && state.ready && !state.error} onResult={async (event, result) => { await state.record(event, current.family, result); }} />
      <div className="square-next row"><Button onClick={() => choose(next)}>{t("Следующий шаг →", "Next step →")}</Button>{lesson.questions.some(q => q.family === current.family && q.uid !== current.uid) && <Button onClick={() => choose(lesson.questions.filter(q => q.family === current.family && q.uid !== current.uid).sort((a, b) => (state.snapshot.seen[a.uid] ?? 0) - (state.snapshot.seen[b.uid] ?? 0))[0])}>{t("Новый вариант", "Try a fresh variant")}</Button>}<a href="#examples">{t("Повторить метод", "Review the method")}</a></div>
      <SquareSaveNotice state={state} />
    </section>
    <section id="challenge" className="card"><h2>{t("Примените метод · авторские экзаменационные задачи", "Apply it · original exam-style problems")}</h2><p>{t("Соединяйте навыки и записывайте рассуждения на бумаге. Проверяются итоговые ответы; сравните метод с критериями.", "Combine skills and show your reasoning on paper. The checker verifies final answers; compare your method with the indicative criteria.")}</p><div className="square-challenges">{lesson.questions.filter(q => q.collection === "exam" || q.collection === "mixed").map(q => <Button key={q.uid} onClick={() => choose(q)}><strong>{questionTitle(q)}</strong><span>{q.marks} {t("баллов за письменное решение →", "written marks →")}</span></Button>)}</div></section>
    <section id="review" className="card"><h2>{t("Вернитесь к тому, что требует практики", "Come back to what needs practice")}</h2>{!Object.keys(state.snapshot.states).length ? <p>{t("План повторения появится после первой проверки.", "Your review plan starts after your first check.")}</p> : <><p>{queue.length ? t("Навыков для повторения сейчас: " + queue.length + ".", queue.length + (queue.length === 1 ? " skill is" : " skills are") + " ready for review.") : t("Пока всё повторено. Вернитесь после перерыва, чтобы проверить, что запомнилось.", "You are up to date for now. Return after a break to check what you remember.")}</p>{queue.length > 0 && <Button onClick={() => choose(queue[0])}>{t("Повторить на новом варианте →", "Review with a fresh variant →")}</Button>}<p className="muted">{t("После верного ответа без помощи: через 1, 3, 7 и 14 дней. Повторы в тот же день не увеличивают интервал. Ошибки возвращаются сегодня; ответы с помощью — раньше.", "After a correct answer without help: 1, 3, 7, then 14 days. Same-day retries do not advance the interval. Mistakes return today; answers with help return sooner.")}</p></>}</section>
    {teacher && <LessonPresentations lessonId={topic.lessonId} />}
    <details className="square-source"><summary>{t("Об этих материалах и сохранённой работе", "About these materials and your existing work")}</summary><p>{t("Задачи взяты из авторской коллекции Maths4U Quadratics. В этом уроке нет экзаменационных вопросов или рисунков Cambridge. Автоматические математические проверки выполнены; независимая редакторская проверка преподавателем ещё ожидается.", "Questions come from the independently authored Maths4U Quadratics collection. No Cambridge examination questions or graphics are included in this lesson. Automated mathematical checks completed; independent teacher editorial review remains pending.")}</p><p><Link href={topic.path + "?view=legacy"}>{t("Прежние конспекты, банк и попытки", "Earlier notes, bank and saved attempts")}</Link> · <Link href="/student/progress">{t("Прогресс класса и прежние ответы", "Class progress and previous answers")}</Link></p></details>
  </div>;
}

function SquareQuestionForm({ q, enabled, onResult, topic }: { topic: QuadraticTopic; q: SquareQuestion; enabled: boolean; onResult: (event: CheckEvent, result: CheckResult) => Promise<void> }) {
  const { t } = useLocale(), actor = useContext(ActorContext), form = useRef<HTMLFormElement>(null);
  const [helpKind, setHelpKind] = useState<"hint" | "solution" | null>(null), [attempted, setAttempted] = useState(false), [stuck, setStuck] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({}), [helpUsed, setHelpUsed] = useState(false), [help, setHelp] = useState(""), [result, setResult] = useState<CheckResult | null>(null), [error, setError] = useState<unknown>(null), [busy, setBusy] = useState(false), [storageIssue, setStorageIssue] = useState(false);
  const draftKey = topic.storage + ".draft." + (actor?.id ?? "guest") + "." + topic.version + "." + q.uid;
  useEffect(() => {
    if (!enabled) return;
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) ?? "null");
      if (d && typeof d.answers === "object" && !(Number.isFinite(d.checkedAt) && Date.now() - d.checkedAt >= 86400000)) {
        setAnswers(Object.fromEntries(q.fields.map(f => [f.key, typeof d.answers[f.key] === "string" ? d.answers[f.key].slice(0, 400) : ""]))); setHelpUsed(d.helpUsed === true); setAttempted(d.attempted === true || Number.isFinite(d.checkedAt));
      }
    } catch { setStorageIssue(true); }
  }, [enabled, draftKey, q.fields]);
  function save(values: Record<string, string>, used: boolean, checkedAt?: number, didAttempt = attempted) { try { localStorage.setItem(draftKey, JSON.stringify({ answers: values, helpUsed: used, checkedAt, attempted: didAttempt })); } catch { setStorageIssue(true); } }
  function change(k: string, value: string) { const next = { ...answers, [k]: value }; setAnswers(next); setResult(null); save(next, helpUsed); }
  function preserveFocus() {
    const focused = document.activeElement;
    return () => requestAnimationFrame(() => {
      if (focused instanceof HTMLElement && focused.isConnected && form.current?.contains(focused) && document.activeElement === document.body) focused.focus({ preventScroll: true });
    });
  }
  async function reveal(kind: "hint" | "solution") { const restoreFocus = preserveFocus(); setBusy(true); setError(null); setHelpUsed(true); save(answers, true); try { const r = await api<{ html: string }>(topic.api + "/help", "POST", { uid: q.uid, kind, version: topic.version }); setHelp(r.html); setHelpKind(kind); } catch (e) { setError(e); } finally { setBusy(false); restoreFocus(); } }
  return <article className="square-question"><div className="row spread"><h3>{questionTitle(q)}</h3><span className="badge">{q.marks} {q.marks === 1 ? t("балл", "mark") : t("баллов", "marks")}</span></div><MathContent html={q.prompt} />
    {q.fields.some(f => /^(a|form_a)$/.test(f.key)) && <p className="square-template">{t("Введите полную форму во всех трёх полях:", "Enter the complete form using all three fields:")} <strong>{q.fields.some(f => f.key === "form_a") ? "A(x − H)² + C" : "a(x − h)² + c"}</strong>.</p>}
    <form ref={form} onSubmit={async e => {
      e.preventDefault(); const restoreFocus = preserveFocus(); setBusy(true); setError(null); setAttempted(true); save(answers, helpUsed, undefined, true);
      const event = { eventKey: crypto.randomUUID(), uid: q.uid, answers, helpUsed, at: Date.now() };
      try { const r = await api<CheckResult>(topic.api + "/check", "POST", { ...event, version: topic.version }); setResult(r); if (r.valid) { save(answers, helpUsed, event.at, true); await onResult(event, r); } } catch (err) { setError(err); } finally { setBusy(false); restoreFocus(); }
    }}>
      <div className="square-answer-grid">{q.fields.map(f => {
        const field = result?.fields[f.key], format = answerFormat(f), invalid = field && !field.correct, feedbackId = "feedback-" + f.key, helpId = "format-" + f.key;
        return <div className="square-answer" key={f.key}>
          {f.type === "choice" ? <fieldset aria-invalid={invalid || undefined} aria-describedby={helpId + " " + feedbackId}><legend>{f.label}</legend>{Object.entries(f.options ?? {}).map(([key, html]) => <label className="square-choice" data-state={answers[f.key] === key && field ? field.correct ? "correct" : "again" : undefined} key={key}><Input type="radio" name={f.key} value={key} aria-invalid={answers[f.key] === key && invalid || undefined} aria-describedby={helpId + " " + feedbackId} checked={answers[f.key] === key} onChange={() => change(f.key, key)} required disabled={!enabled || busy} /><MathContent html={html} />{answers[f.key] === key && field && <span className="square-choice-status" aria-label={field.correct ? t("Верно", "Correct") : t("Попробуйте ещё", "Look again")}>{field.correct ? "✓" : "↻"}</span>}</label>)}</fieldset> : <label>{f.label}<Input name={f.key} aria-invalid={invalid || undefined} aria-describedby={helpId + " " + feedbackId} value={answers[f.key] ?? ""} onChange={e => change(f.key, e.target.value)} maxLength={400} required autoComplete="off" spellCheck={false} disabled={!enabled || busy} placeholder={format.placeholder} /></label>}
          <div className="square-field-status"><p className="square-field-format" id={helpId}>{t(format.ru, format.en)}</p><div id={feedbackId}>{field && <Feedback compact kind={field.correct ? "correct" : field.formatError ? "format" : "again"}>{!field.correct && (field.formatError ? t("Используйте формат, указанный под этим полем.", "Use the answer format shown under this field.") : field.message)}</Feedback>}</div></div>
        </div>;
      })}</div>
      {q.fields.some(f => f.type !== "choice") && <details className="square-format"><summary>{t("Полная справка по вводу ответов", "Full answer-format guide")}</summary><p>{t("Точные числа: 3/2, sqrt(5), 2-sqrt(3). Множества: {1,4}. Интервалы: (3,5]; круглая скобка исключает границу. Бесконечность: inf, объединение: U, нет решений: empty. Пары и тройки координат разделяйте точкой с запятой. Выражения: 2x^2+3x-1; уравнения: x^2=3x+1 или многочлен, равный нулю. Множители: x-1 ; x+2. Дробь с параметром: числитель ; знаменатель. Целые числа перечисляйте списком.", "Exact numbers: 3/2, sqrt(5), 2-sqrt(3). Sets: {1,4}. Intervals: (3,5]; a round bracket excludes the endpoint. Infinity: inf; union: U; no solutions: empty. Separate coordinate pairs or triples with semicolons. Expressions: 2x^2+3x-1; equations: x^2=3x+1 or the polynomial equal to zero. Factors: x-1 ; x+2. Parameter fraction: numerator ; denominator. List integer answers individually.")}</p></details>}
      <div className="row square-form-actions"><Button variant="primary" type="submit" disabled={!enabled || busy}>{busy ? t("Проверка…", "Checking…") : t("Проверить ответ", "Check answer")}</Button><Button type="button" disabled={!enabled || busy} onClick={() => void reveal("hint")}>{t("Подсказка", "Hint")}</Button>{attempted || stuck ? <Button type="button" variant="text" disabled={!enabled || busy} onClick={() => void reveal("solution")}>{t("Показать разобранное решение", "Show worked solution")}</Button> : <Button type="button" variant="text" disabled={!enabled || busy} onClick={() => setStuck(true)}>{t("Я не знаю, как решить", "I’m stuck")}</Button>}</div>
    </form>
    <ErrorNotice error={error} />
    <div className="square-result">{result && <Feedback kind={result.correct ? "correct" : result.valid ? "again" : "format"}>{result.correct ? t("Все итоговые ответы верны.", "All final answers are correct.") + (helpUsed ? t(" Теперь попробуйте новый вариант без помощи.", " Now try a fresh variant without help.") : t(" Переходите дальше или вернитесь позже для повторения.", " Try the next step or return later for review.")) : result.valid ? t("Проверьте поля с отметкой «Попробуйте ещё».", "Look at the fields marked ‘Look again’, then try again.") : t("Некоторые ответы не удалось прочитать. Проверьте формат в отмеченных полях; результат ещё не записан.", "Some answers could not be read. Check the marked fields; no result has been recorded yet.")}</Feedback>}</div>
    {q.manual && <p className="muted">{t("Проверяются только итоговые ответы. Сравните объяснение, рисунок и метод с разобранным решением; баллы за метод требуют проверки.", "The checker checks final answers only. Compare your explanation, sketch and method with the worked solution; method marks need review.")}</p>}
    {help && (helpKind === "hint" ? <Feedback kind="hint"><MathContent html={help} /></Feedback> : <section className="square-help" aria-label={t("Разобранное решение", "Worked solution")}><MathContent html={help} /></section>)}
    {storageIssue && <p role="alert">{t("Не удалось сохранить черновик в браузере. Не закрывайте страницу до окончания работы.", "This draft could not be saved in your browser. Keep the page open until you finish.")}</p>}
  </article>;
}
