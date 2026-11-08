"use client";
import { Button, ButtonLink, Input, Select, Textarea } from "./controls";
import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { ActorContext, useLocale, useResource, Heading, Form, Field, str, num, api, ErrorNotice, Loading, localDate, ApiError } from "./ui";
import type { TaskInput, editorTask } from "@/lib/content";
import type { courses } from "@/lib/courses";
import { BasketPanel, useTaskBasket } from "./task-basket";
import type { ClassList } from "./screens";
import {reassignAsset} from "@/lib/asset-association";
import { MarkSchemeStatusField } from "./mark-scheme-text";
import { TeacherTaskPreview } from "./teacher-task-preview";

function WorkFields({ classes, olymp = false }: { classes: ClassList; olymp?: boolean }) {
  const { t } = useLocale();
  const [createdAt] = useState(() => Date.now());
  const selectedClass = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("class") ?? "";
  return <><h2>{t("2. Настройте работу", "2. Set up the work")}</h2><div className="field-grid"><Field name="title" label={t("Название работы", "Work title")} />
    {!olymp && <label>{t("Класс", "Class")}<Select name="classId" required defaultValue={selectedClass}><option value="">{t("Выберите класс", "Choose a class")}</option>{classes.filter(c => !c.archivedAt).map(c => <option value={c.id} key={c.id}>{c.title}</option>)}</Select></label>}
    {!olymp && <label>{t("Тип", "Type")}<Select name="kind"><option value="HOMEWORK">{t("Домашняя работа", "Homework")}</option><option value="TEST">{t("Тест", "Test")}</option></Select></label>}
    <Field name="opensAt" type="datetime-local" label={t("Открывается (местное время)", "Opens (local time)")} value={localDate(new Date(createdAt))} />
    <Field name="dueAt" type="datetime-local" label={t("Дедлайн (местное время)", "Deadline (local time)")} value={localDate(new Date(createdAt + 86400000))} />
    <Field name="minutes" type="number" label={t("Ограничение времени, минут (необязательно)", "Time limit, minutes (optional)")} required={false} min={1} max={1440} />
    {!olymp && <Field name="attemptsAllowed" type="number" label={t("Количество попыток", "Attempts allowed")} value={1} min={1} max={10} />}
    {!olymp && <label>{t("Когда показать результаты", "When to show results")}<Select name="resultPolicy" defaultValue="MANUAL"><option value="MANUAL">{t("После публикации учителем", "After teacher publication")}</option><option value="AFTER_DEADLINE">{t("После дедлайна", "After the deadline")}</option><option value="AFTER_SUBMIT">{t("После сдачи", "After submission")}</option></Select></label>}
  </div><label className="check"><Input type="checkbox" name="revealSolutions" />{t("Показать решения вместе с результатами, когда новые попытки больше недоступны", "Show solutions with results once no new attempts are available")}</label><label className="check"><Input type="checkbox" name="allowFiles" defaultChecked />{t("Принимать фотографии и PDF решений", "Accept photos and PDF solutions")}</label></>;
}
function workData(f: FormData, ids: string[], olymp = false) {
  return { title: str(f, "title"), kind: olymp ? "OLYMPIAD" : str(f, "kind"), ...(olymp ? {} : { classId: str(f, "classId") }),
    taskIds: ids, opensAt: new Date(str(f, "opensAt")).toISOString(), dueAt: new Date(str(f, "dueAt")).toISOString(),
    timeLimitSeconds: str(f, "minutes") ? num(f, "minutes") * 60 : null, attemptsAllowed: olymp ? 1 : num(f, "attemptsAllowed"),
    resultPolicy: olymp ? "MANUAL" : str(f, "resultPolicy"), revealSolutions: f.has("revealSolutions"), allowFiles: f.has("allowFiles") };
}
export function WorkEditor() {
  const router = useRouter(), { t } = useLocale(), basket = useTaskBasket(), classes = useResource<ClassList>("classes?manage=1");
  const [topicId] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("topic") ?? "");
  if (topicId) return <TopicAssignmentEditor topicId={topicId} />;
  return <><Heading title={t("Назначить работу", "Assign work")} subtitle={t("Проверьте набор, выберите класс и время выполнения.", "Review the task set, choose a class and schedule.")} /><ErrorNotice error={classes.error} />
    {!basket.data || !classes.data ? <Loading /> : <div className="card"><Form primary label={t("Назначить ученикам", "Assign to students")} submit={async f => {
      const saved = await basket.flush(); if (!saved?.items.length || saved.items.some(i => !i.available)) throw new ApiError("TASK_UNAVAILABLE", 400);
      const w = await api<{ id: string }>("works", "POST", workData(f, saved.taskIds)); router.push("/works/" + w.id + "/results");
    }}><BasketPanel /><WorkFields classes={classes.data} /></Form></div>}</>;
}
function TopicAssignmentEditor({ topicId }: { topicId: string }) {
  const router = useRouter(), { t } = useLocale(), classes = useResource<ClassList>("classes?manage=1"), tasks = useResource<import("@/lib/catalog").CatalogDto>("catalog?topic=" + encodeURIComponent(topicId) + "&pageSize=50");
  const [selected, setSelected] = useState<string[]>([]);
  return <><Heading title={t("Задание из темы", "Assignment from a topic")} subtitle={t("Выберите до 50 задач. Ваш предыдущий набор задач сохранится.", "Choose up to 50 questions. Your previous question set is preserved.")} /><ErrorNotice error={tasks.error || classes.error} />{!tasks.data || !classes.data ? <Loading /> : <section className="card"><Form primary label={t("Назначить классу", "Assign to class")} submit={async f => {
    if (!selected.length) throw new ApiError("TASK_UNAVAILABLE", 400);
    const w = await api<{id:string}>("works", "POST", workData(f, selected)); router.push("/works/" + w.id + "/results");
  }}><p>{t("Первые 50 доступных задач темы. Для другой подборки используйте общий банк.", "The first 50 available questions in this topic. Use the library for a different selection.")}</p><div className="topic-question-picker">{tasks.data.items.map(q => <article className="topic-question-choice" key={q.id}><label className="check"><Input type="checkbox" checked={selected.includes(q.id)} disabled={!selected.includes(q.id) && selected.length >= 50} onChange={e => { const checked = e.target.checked; setSelected(s => checked ? s.length < 50 ? [...s.filter(id => id !== q.id), q.id] : s : s.filter(id => id !== q.id)); }} /><span>{q.version.title} · {q.points} marks</span></label><TeacherTaskPreview taskId={q.id} version={q.version} /></article>)}</div><WorkFields classes={classes.data} /></Form></section>}</>;
}
export function OlympiadEditor() {
  const router = useRouter();
  const { t } = useLocale(), basket = useTaskBasket();
  const [createdAt] = useState(() => Date.now());
  return <><Heading title={t("Новая олимпиада", "New olympiad")} subtitle={t("Одна возрастная группа и один тур. Результаты публикует организатор.", "One age group and one round. The organizer publishes results.")} /><ErrorNotice error={basket.error} />
    {!basket.data ? <Loading /> : <div className="card"><Form primary label={t("Создать олимпиаду", "Create olympiad")} submit={async f => {
      const saved = await basket.flush(); if (!saved?.items.length || saved.items.some(i => !i.available)) throw new ApiError("TASK_UNAVAILABLE", 400);
      await api("olympiads", "POST", { title: str(f, "olympiadTitle"), registrationOpensAt: new Date(str(f, "registrationOpensAt")).toISOString(),
        registrationClosesAt: new Date(str(f, "registrationClosesAt")).toISOString(), groupTitle: str(f, "groupTitle"), minAge: num(f, "minAge"), maxAge: num(f, "maxAge"), work: workData(f, saved.taskIds, true) });
      router.push("/olympiads");
    }}><div className="field-grid"><Field name="olympiadTitle" label={t("Название олимпиады", "Olympiad title")} /><Field name="groupTitle" label={t("Название группы", "Age group title")} value={t("Младшая группа", "Junior group")} />
      <Field name="minAge" label={t("Возраст от", "Minimum age")} type="number" value={10} min={5} max={99} /><Field name="maxAge" label={t("Возраст до", "Maximum age")} type="number" value={14} min={5} max={99} />
      <Field name="registrationOpensAt" label={t("Начало регистрации", "Registration opens")} type="datetime-local" value={localDate(new Date(createdAt))} />
      <Field name="registrationClosesAt" label={t("Конец регистрации", "Registration closes")} type="datetime-local" value={localDate(new Date(createdAt + 3600000))} /></div>
      <BasketPanel /><WorkFields classes={[]} olymp />
    </Form></div>}</>;
}
const blankText = (locale: "ru" | "en") => ({ locale, title: "", statement: "", hint: "", solution: "", markScheme: "", markSchemeSource: "", teacherNote: "" });
const blankPart = (): TaskInput["parts"][number] => ({ kind: "SHORT", maxPoints: 1, caseSensitive: false, tolerance: 0, acceptedAnswers: [],
  texts: [{ locale: "ru", prompt: "", answer: "", rubric: "" }, { locale: "en", prompt: "", answer: "", rubric: "" }], options: [] });
const initialTask: TaskInput = { visibility: "PRIVATE", featureKey: null, difficulty: 1, difficultyKnown: false, materialCategory: "UNKNOWN", topicIds: [], texts: [blankText("ru"), blankText("en")], parts: [blankPart()], assets: [] };
export function TaskEditor({ id }: { id?: string }) {
  const r = useResource<Awaited<ReturnType<typeof editorTask>>>(id ? "tasks/" + id : null);
  if (r.error) return <ErrorNotice error={r.error} />;
  if (id && !r.data) return <Loading />;
  let initial = initialTask;
  if (r.data) {
    const task = r.data, v = task.versions[0];
    initial = { visibility: task.visibility, featureKey: task.featureKey, difficulty: v.difficulty, difficultyKnown: v.difficultyKnown, materialCategory: v.materialCategory, source: v.source?.name, syllabus: v.syllabus ?? undefined,
      sourceReference:v.sourceReference??undefined, sourceUid:v.sourceUid??undefined, component:v.component??undefined, seriesCode:v.seriesCode??undefined, qualification:v.qualification??undefined, examBoard: v.examBoard ?? undefined, year: v.year ?? undefined, examSession: v.examSession ?? undefined, paper: v.paper ?? undefined, questionNumber: v.questionNumber ?? undefined,
      topicIds: task.topics.map(t => t.topicId), texts: (["ru", "en"] as const).map(locale => (() => { const t = v.texts.find(t => t.locale === locale); return t ? { ...t, markScheme: t.markScheme ?? "", markSchemeSource: t.markSchemeSource ?? "" } : blankText(locale); })()),
      parts: v.parts.map(p => ({ ...p, numericAnswer: p.numericAnswer ?? undefined, acceptedAnswers: p.acceptedAnswers.map(a => a.value),
        texts: (["ru", "en"] as const).map(locale => p.texts.find(t => t.locale === locale) ?? { locale, prompt: "", answer: "", rubric: "" }),
        options: p.options.map(o => ({ correct: o.correct, texts: o.texts })) })), assets: v.assets.map(a => ({ fileId: a.fileId, role: a.role, caption: a.caption, partPosition:a.partPosition, locale: a.locale ?? undefined })) };
  }
  return <TaskEditorForm key={r.data?.versions[0].id ?? "new"} initial={initial} id={id} />;
}
function TaskEditorForm({ initial, id }: { initial: TaskInput; id?: string }) {
  const router = useRouter();
  const { t } = useLocale(), actor = useContext(ActorContext), administrator = actor?.roles.some(r => r.role === "ADMIN");
  const [task, setTask] = useState<TaskInput>(initial), [uploadError, setUploadError] = useState<unknown>(null);
  const availableCourses = useResource<Awaited<ReturnType<typeof courses>>>("courses");
  const update = (fn: (draft: TaskInput) => void) => setTask(old => { const draft = structuredClone(old); fn(draft); return draft; });
  return <><Heading title={id ? t("Редактировать задачу", "Edit problem") : t("Новая задача", "New problem")} subtitle={t("Формулы: \\(x^2\\) или $$x^2$$. Поддерживаются безопасный HTML и таблицы.", "Formulas: \\(x^2\\) or $$x^2$$. Safe HTML and tables are supported.")} />
    {id && <p><ButtonLink className="button secondary" href={"/api/tasks/" + id + "/export"}>{t("Скачать JSON сохранённой версии", "Download saved version JSON")}</ButtonLink></p>}
    <div className="card"><Form primary label={t("Сохранить задачу", "Save problem")} submit={async () => {
      const texts = task.texts.filter(t => t.title.trim() && t.statement.trim());
      const locales = texts.map(t => t.locale);
      await api(id ? "tasks/" + id : "tasks", id ? "PATCH" : "POST", { ...task, texts, parts: task.parts.map(p => ({ ...p, texts: p.texts.filter(t => locales.includes(t.locale)) })) });
      router.push("/library");
    }}>
      <div className="grid two">{task.texts.map((text, ti) => <section className="stack" key={text.locale}><h2>{text.locale === "ru" ? "Русский" : "English"}</h2>
        {(["title", "statement", "answer", "hint", "solution", "markScheme", "markSchemeSource", "markSchemeText", "teacherNote"] as const).map(key => <label key={key}>{({ title: t("Название", "Title"), statement: t("Условие", "Statement"), answer:t("Краткий ответ", "Short answer"), markSchemeText:t("Текстовая версия MS", "MS transcription"), hint: t("Подсказка", "Hint"), solution: t("Подробное решение", "Detailed solution"), markScheme: t("MS — схема оценивания", "MS — mark scheme"), markSchemeSource: t("Происхождение MS (документ / URL)", "MS provenance (document / URL)"), teacherNote: t("Заметка учителю", "Teacher note") })[key]}
          {key === "title" ? <Input value={text[key]??""} maxLength={191} onChange={e => update(d => { d.texts[ti][key] = e.target.value; })} /> : <Textarea value={text[key]??""} onChange={e => update(d => { d.texts[ti][key] = e.target.value; })} />}</label>)}
        <MarkSchemeStatusField value={text.markSchemeStatus} onChange={s=>update(d=>{d.texts[ti].markSchemeStatus=s;})}/>
      </section>)}</div>
      <h2>{t("Ответы и оценивание", "Answers & marking")}</h2>
      <label>{t("Тип материала (независим от типа работы)", "Material type (independent of work mode)")}<Select value={task.materialCategory} onChange={e => update(d => { d.materialCategory = e.target.value as TaskInput["materialCategory"]; })}><option value="UNKNOWN">{t("Не указан", "Unspecified")}</option><option value="EXAM">{t("Экзамен", "Exam")}</option><option value="TRAINING">{t("Тренировочная задача", "Training")}</option><option value="OLYMPIAD">{t("Олимпиадная задача", "Olympiad")}</option></Select></label>
      <label className="check"><Input type="checkbox" checked={task.difficultyKnown} onChange={e => update(d => { d.difficultyKnown = e.target.checked; })} />{t("Сложность подтверждена источником / автором", "Difficulty is confirmed by source / author")}</label>
      {task.parts.map((part, pi) => <section className="card" key={pi}><div className="row spread"><h3>{t("Часть ", "Part ")}{pi + 1}</h3>{task.parts.length > 1 && <Button type="button" className="quiet" onClick={() => update(d => { d.parts.splice(pi, 1); d.assets.forEach(a=>{if(a.partPosition===pi)a.partPosition=null;else if(a.partPosition!=null&&a.partPosition>pi)a.partPosition--;}); })}>{t("Убрать", "Remove")}</Button>}</div>
        <div className="field-grid"><label>{t("Тип ответа", "Answer type")}<Select value={part.kind} onChange={e => update(d => { d.parts[pi].kind = e.target.value as typeof part.kind; })}>
          <option value="SHORT">{t("Короткий ответ", "Short answer")}</option><option value="NUMERIC">{t("Число", "Numeric")}</option><option value="CHOICE">{t("Выбор варианта", "Multiple choice")}</option><option value="MANUAL">{t("Развёрнутое решение", "Written solution")}</option></Select></label>
          <label>{t("Максимум баллов", "Maximum points")}<Input type="number" value={part.maxPoints} min={0.25} max={100} step={0.25} onChange={e => update(d => { d.parts[pi].maxPoints = Number(e.target.value); })} /></label></div>
        <div className="field-grid space-top-16" >{part.texts.map((pt, ti) => <div className="stack" key={pt.locale}><strong>{pt.locale.toUpperCase()}</strong>{(["prompt", "answer", "rubric", "markScheme", "markSchemeSource", "markSchemeText"] as const).map(key => <label key={key}>{key === "prompt" ? t("Условие части", "Part prompt") : key === "answer" ? t("Ответ для ученика после раскрытия", "Answer shown after release") : key === "markScheme" ? t("MS части", "Part MS") : key === "markSchemeSource" ? t("Источник MS", "MS provenance") : key === "markSchemeText" ? t("Текстовая версия MS части", "Part MS transcription") : t("Критерии оценивания", "Marking criteria")}
          <Textarea value={pt[key]??""} onChange={e => update(d => { d.parts[pi].texts[ti][key] = e.target.value; })} /></label>)}<MarkSchemeStatusField value={pt.markSchemeStatus} onChange={s=>update(d=>{d.parts[pi].texts[ti].markSchemeStatus=s;})}/></div>)}</div>
        {part.kind === "SHORT" && <div className="stack space-top-16" ><label>{t("Допустимые ответы, каждый с новой строки", "Accepted answers, one per line")}<Textarea value={part.acceptedAnswers.join("\n")} onChange={e => update(d => { d.parts[pi].acceptedAnswers = e.target.value.split("\n"); })} /></label><label className="check"><Input type="checkbox" checked={part.caseSensitive} onChange={e => update(d => { d.parts[pi].caseSensitive = e.target.checked; })} />{t("Учитывать регистр", "Case sensitive")}</label></div>}
        {part.kind === "NUMERIC" && <div className="field-grid space-top-16" ><label>{t("Правильное число", "Correct number")}<Input type="number" step="any" value={part.numericAnswer ?? ""} required onChange={e => update(d => { d.parts[pi].numericAnswer = Number(e.target.value); })} /></label><label>{t("Абсолютная погрешность", "Absolute tolerance")}<Input type="number" step="any" min="0" value={part.tolerance} onChange={e => update(d => { d.parts[pi].tolerance = Number(e.target.value); })} /></label></div>}
        {part.kind === "CHOICE" && <div className="stack space-top-16" >{part.options.map((option, oi) => <div className="row" key={oi}><label className="check"><Input type="radio" name={"correct-" + pi} checked={option.correct} onChange={() => update(d => { d.parts[pi].options.forEach((o, i) => { o.correct = oi === i; }); })} />{t("Верный", "Correct")}</label>{option.texts.map((ot, ti) => <label key={ot.locale} className="field-grow">{ot.locale.toUpperCase()}<Input value={ot.text} onChange={e => update(d => { d.parts[pi].options[oi].texts[ti].text = e.target.value; })} /></label>)}</div>)}
          <Button className="secondary" type="button" onClick={() => update(d => { d.parts[pi].options.push({ correct: d.parts[pi].options.length === 0, texts: [{ locale: "ru", text: "" }, { locale: "en", text: "" }] }); })}>{t("+ Вариант", "+ Option")}</Button></div>}
      </section>)}
      <Button className="secondary" type="button" onClick={() => update(d => { d.parts.push(blankPart()); })}>{t("+ Добавить часть", "+ Add part")}</Button>
      <details><summary>{t("Темы, источник и экзаменационные данные", "Topics, source and exam details")}</summary><div className="field-grid">
        {(["source", "syllabus", "examBoard", "examSession", "paper", "questionNumber", "component", "seriesCode", "qualification", "sourceUid", "sourceReference"] as const).map(key => <label key={key}>{({ source: t("Источник", "Source"), syllabus: t("Программа", "Syllabus"), examBoard: "Exam board", examSession: t("Сессия", "Session"), paper: "Paper", component:"Component", seriesCode:t("Код сессии", "Series code"), qualification:t("Квалификация", "Qualification"), sourceUid:"Source UID", sourceReference:t("Ссылка на источник", "Source reference"), questionNumber: t("Номер вопроса", "Question number") })[key]}<Input value={task[key] ?? ""} onChange={e => update(d => { d[key] = e.target.value; })} /></label>)}
        <label>{t("Год", "Year")}<Input type="number" value={task.year ?? ""} onChange={e => update(d => { d.year = e.target.value ? Number(e.target.value) : undefined; })} /></label><label>{t("Сложность (1–5)", "Difficulty (1–5)")}<Input type="number" min={1} max={5} value={task.difficulty} onChange={e => update(d => { d.difficulty = Number(e.target.value); })} /></label>
      </div><div className="row space-top-16" >{availableCourses.data?.flatMap(c => c.topics).map(topic => <label className="check" key={topic.id}><Input type="checkbox" checked={task.topicIds.includes(topic.id)} onChange={e => update(d => { d.topicIds = e.target.checked ? [...d.topicIds, topic.id] : d.topicIds.filter(id => id !== topic.id); })} />{topic.title}</label>)}</div></details>
      <details><summary>{t("Рисунки и файлы", "Figures & files")}</summary><ErrorNotice error={uploadError} /><label>{t("Загрузить PNG, JPEG или PDF (до 8 МБ)", "Upload PNG, JPEG or PDF (up to 8 MB)")}<Input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return; const form = new FormData(); form.set("file", file);
        try { const saved = await api<{ id: string; originalName: string }>("files", "POST", form); update(d => { d.assets.push({ fileId: saved.id, caption: saved.originalName, role: "STATEMENT" }); }); setUploadError(null); } catch (e) { setUploadError(e); }
      }} /></label>{task.assets.map((a, i) => <div className="field-grid item" key={i}><label>{t("Подпись", "Caption")}<Input value={a.caption} onChange={e => update(d => { d.assets[i].caption = e.target.value; })} /></label><label>{t("Назначение", "Purpose")}<Select value={a.role} onChange={e => update(d => { reassignAsset(d,i,e.target.value as typeof a.role); })}><option value="STATEMENT">{t("Условие", "Statement")}</option><option value="ANSWER">{t("Краткий ответ", "Short answer")}</option><option value="SOLUTION">{t("Решение", "Solution")}</option><option value="MARK_SCHEME">MS</option><option value="HINT">{t("Подсказка", "Hint")}</option><option value="TEACHER">{t("Учителю", "Teacher only")}</option></Select></label><label>{t("Привязка файла", "File association")}<Select value={a.partPosition??""} onChange={e=>update(d=>{d.assets[i].partPosition=e.target.value===""?null:Number(e.target.value);})}><option value="">{t("Вся задача", "Whole task")}</option>{task.parts.map((_,pi)=><option key={pi} value={pi}>{t("Часть", "Part")} {pi+1}</option>)}</Select></label></div>)}</details>
      {administrator && <div className="field-grid"><label>{t("Публикация", "Visibility")}<Select value={task.visibility} onChange={e => update(d => { d.visibility = e.target.value as typeof task.visibility; })}><option value="PRIVATE">{t("Только владельцу", "Owner only")}</option><option value="PUBLIC">{t("Общий банк задач", "Shared problem bank")}</option></Select></label><label>{t("Код платного доступа (необязательно)", "Access feature key (optional)")}<Input value={task.featureKey ?? ""} onChange={e => update(d => { d.featureKey = e.target.value || null; })} /></label></div>}
    </Form></div></>;
}
export function CourseEditor() {
  const { t } = useLocale();
  return <><Heading title={t("Курс и теория", "Course & theory")} subtitle={t("Повторите код курса и темы, чтобы обновить существующий материал.", "Reuse the course and topic codes to update existing material.")} /><div className="card"><Form label={t("Сохранить курс", "Save course")} submit={f => api("courses", "POST", {
    slug: str(f, "slug"), topicSlug: str(f, "topicSlug"), topicRu: str(f, "topicRu"), topicEn: str(f, "topicEn"), lessonRu: str(f, "lessonRu"), lessonEn: str(f, "lessonEn"),
    featureKey: str(f, "featureKey") || null, published: f.has("published"), texts: [{ locale: "ru", title: str(f, "titleRu"), description: str(f, "descriptionRu") }, { locale: "en", title: str(f, "titleEn"), description: str(f, "descriptionEn") }],
  })}><div className="field-grid">{[
    ["slug", t("Код курса: например algebra", "Course code: e.g. algebra")], ["topicSlug", t("Код темы: например equations", "Topic code: e.g. equations")],
    ["titleRu", "Название курса RU"], ["titleEn", "Course title EN"], ["topicRu", "Тема RU"], ["topicEn", "Topic EN"],
    ["descriptionRu", "Описание RU"], ["descriptionEn", "Description EN"],
  ].map(([name, label]) => <Field key={name} name={name} label={label} />)}</div>
    <div className="field-grid"><label>Теория RU<Textarea name="lessonRu" required rows={12} /></label><label>Theory EN<Textarea name="lessonEn" required rows={12} /></label></div>
    <Field name="featureKey" label={t("Код платного доступа (необязательно)", "Access feature key (optional)")} required={false} /><label className="check"><Input name="published" type="checkbox" defaultChecked />{t("Опубликовать", "Publish")}</label></Form></div></>;
}
