"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink, Input, Select } from "./controls";
import { FullQuestion } from "./full-question";
import { Empty, Loading } from "./ui";
import { ManageArchiveAccess } from "./exam-archive-access";
import { ExamArchiveQuestionList, PastPapers, QuestionPanel } from "./exam-archive-papers";
import { ArchiveLink, countLabel, emptyFilters, filterKeys, hrefFor, readLocation, requestArchive, sessionLabel, sessionSort, sortLabel, Status, useArchive,
  type Filters, type Navigate, type Overview, type PaperRow, type Question, type Shared, type Topic, type TopicNode, type View } from "./exam-archive-navigation";
import styles from "./exam-archive.module.css";

export function ExamArchiveScreen({ initialQuery }: { initialQuery: string }) {
  const [revision, setRevision] = useState(0);
  const response = useArchive<Overview>("", revision);
  const refresh = () => setRevision(value => value + 1);
  useEffect(() => {
    const focus = () => setRevision(value => value + 1);
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, []);
  if (response?.error) return <><h1>Exam archive</h1><Status error={response.error} /><Button onClick={refresh}>Try again</Button></>;
  if (!response?.value) return <><h1>Exam archive</h1><Loading /></>;
  return <ArchiveContents overview={response.value} revision={revision} initialQuery={initialQuery} />;
}

function ArchiveContents({ overview, revision, initialQuery }: { overview: Overview; revision: number; initialQuery: string }) {
  const [view, setView] = useState(() => readLocation(overview.preferences, typeof window === "undefined" ? initialQuery : window.location.search));
  const [saveError, setSaveError] = useState(false);
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    const restore = () => setView(current => {
      const parsed = readLocation(overview.preferences, window.location.search);
      return parsed.mode === "topicwise"
        ? { ...current, ...parsed, syllabus: current.syllabus, year: current.year, session: current.session, paperId: current.paperId }
        : { ...current, ...parsed, course: current.course, chapter: current.chapter, topicKey: current.topicKey, topicActivity: current.topicActivity, filters: current.filters };
    });
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [overview.preferences]);

  const navigate: Navigate = (next, preferences) => {
    const updated = { ...view, ...next };
    window.history.pushState(null, "", hrefFor(updated));
    setView(updated);
    if (!preferences) return;
    setSaveError(false);
    pending.current = pending.current.catch(() => undefined)
      .then(() => requestArchive("/preferences", { method: "PATCH", body: JSON.stringify(preferences) }))
      .catch(() => setSaveError(true));
  };

  const modes = [{ mode: "topicwise", title: "Topicwise" }, { mode: "past-papers", title: "Past papers" }] as const;
  const managed = view.manage && overview.admin;
  const topicMode = view.mode === "topicwise";
  return <div className={styles.screen}>
    <nav className={styles.modes} aria-label="Exam archive views">
      {modes.map(({ mode, title }) => <ArchiveLink key={mode} view={view} next={{ mode, manage: false, questionId: "" }} navigate={navigate}
        current={mode === view.mode && !managed} className={styles.pill} save={{ mode }}>{title}</ArchiveLink>)}
      {overview.admin && <ArchiveLink view={view} next={{ manage: true }} navigate={navigate}
        current={managed} className={styles.manageLink}>Manage access</ArchiveLink>}
    </nav>
    <h1>{managed ? "Manage archive access" : topicMode ? "Exam archive by topic" : "Past Papers"}</h1>
    {saveError && <p role="status" className={styles.muted}>Your selection could not be saved to your account.</p>}
    {managed ? <ManageArchiveAccess revision={revision} /> : topicMode
      ? <Topicwise overview={overview} view={view} navigate={navigate} revision={revision} />
      : <PastPapers overview={overview} view={view} navigate={navigate} revision={revision} />}
  </div>;
}

function courseGroups(topics: TopicNode[]) {
  const groups = new Map<string, { course: TopicNode; chapters: Map<string, TopicNode[]> }>();
  for (const topic of topics) {
    const group = groups.get(topic.courseKey) ?? { course: topic, chapters: new Map<string, TopicNode[]>() };
    const chapter = group.chapters.get(topic.chapterKey) ?? [];
    chapter.push(topic);
    group.chapters.set(topic.chapterKey, chapter);
    groups.set(topic.courseKey, group);
  }
  return [...groups.values()].map(({ course, chapters }) => ({
    course,
    chapters: [...chapters.values()].sort((a, b) => a[0].chapterOrder - b[0].chapterOrder || sortLabel(a[0].chapterTitle, b[0].chapterTitle))
      .map(items => items.sort((a, b) => a.position - b.position || sortLabel(a.title, b.title))),
  }));
}

function Topicwise({ overview, view, navigate, revision }: Shared) {
  const topicKey = view.topicKey && Object.hasOwn(overview.topicAliases, view.topicKey)
    ? overview.topicAliases[view.topicKey] : view.topicKey;
  const selected = overview.topics.find(topic => topic.id === topicKey);
  const courseKey = selected?.courseKey ?? view.course;
  const chapterAliases = Object.hasOwn(overview.chapterAliases, courseKey) ? overview.chapterAliases[courseKey] : undefined;
  const chapterKey = selected?.chapterKey ?? (chapterAliases && Object.hasOwn(chapterAliases, view.chapter) ? chapterAliases[view.chapter] : view.chapter);
  const followed = new Set(overview.followedCourseSlugs);
  const groups = courseGroups(overview.topics.filter(topic => view.showOtherCourses || !!(topic.courseSlug && followed.has(topic.courseSlug))));
  const group = courseGroups(overview.topics.filter(topic => topic.courseKey === courseKey))[0];
  const chapter = group?.chapters.find(items => items[0].chapterKey === chapterKey);
  const reset = { topicKey: null, questionId: "", topicActivity: "overview" as const, originalPage: 1, page: 1, filters: emptyFilters };
  const openTopic = (topic: TopicNode, topicActivity: View["topicActivity"] = "overview") =>
    ({ ...reset, course: topic.courseKey, chapter: topic.chapterKey, topicKey: topic.id, topicActivity });

  if (selected && chapter) return <>
    <nav aria-label="Topic path" className={styles.breadcrumbs}>
      <ArchiveLink view={view} next={{ ...reset, course: "", chapter: "" }} save={{ topicKey: null }} navigate={navigate}>Courses</ArchiveLink>
      <ArchiveLink view={view} next={{ ...reset, course: courseKey, chapter: "" }} save={{ topicKey: null }} navigate={navigate}>{selected.courseTitle}</ArchiveLink>
      <ArchiveLink view={view} next={{ ...reset, course: courseKey, chapter: chapterKey }} save={{ topicKey: null }} navigate={navigate}>{selected.chapterTitle}</ArchiveLink>
    </nav>
    <nav aria-label="Subtopics" className={styles.siblings}>
      {chapter.map(topic => <ArchiveLink key={topic.id} view={view} next={openTopic(topic, view.topicActivity)} save={{ topicKey: topic.id }} navigate={navigate}
        current={topic.id === selected.id} className={styles.pill}>{topic.title}</ArchiveLink>)}
    </nav>
    <h2>{selected.title}</h2>
    {view.questionId ? <QuestionPanel view={view} navigate={navigate} revision={revision} />
      : <TopicDetail key={selected.id} topic={selected} overview={overview} view={view} navigate={navigate} revision={revision} />}
  </>;

  if (group) return <>
    <nav aria-label="Topic path" className={styles.breadcrumbs}>
      <ArchiveLink view={view} next={{ ...reset, course: "", chapter: "" }} save={{ topicKey: null }} navigate={navigate}>Courses</ArchiveLink>
      {chapter && <ArchiveLink view={view} next={{ ...reset, course: courseKey, chapter: "" }} navigate={navigate}>{group.course.courseTitle}</ArchiveLink>}
    </nav>
    <h2>{chapter ? chapter[0].chapterTitle : group.course.courseTitle}</h2>
    <ul className={styles.rows}>
      {chapter ? chapter.map(topic => <li key={topic.id} className={styles.row}>
        <ArchiveLink view={view} next={openTopic(topic)} save={{ topicKey: topic.id }} navigate={navigate} className={styles.topicTitle}>{topic.title}</ArchiveLink>
        <div className={styles.topicActions}>
          {topic.questionCounts.exam > 0 && <ArchiveLink view={view} next={openTopic(topic, "exam")} save={{ topicKey: topic.id }} navigate={navigate} className={styles.countLink}
            label={countLabel(topic.questionCounts.exam, "exam question") + " · " + topic.title}>
            <ProblemIcon />{countLabel(topic.questionCounts.exam, "exam question")}
          </ArchiveLink>}
          {topic.questionCounts.practice > 0 && <ArchiveLink view={view} next={openTopic(topic, "practice")} save={{ topicKey: topic.id }} navigate={navigate} className={styles.countLink}
            label={countLabel(topic.questionCounts.practice, "practice question") + " · " + topic.title}>
            <PracticeIcon />{countLabel(topic.questionCounts.practice, "practice question")}
          </ArchiveLink>}
        </div>
      </li>) : group.chapters.map(items => <li key={items[0].chapterKey}>
        <ArchiveLink view={view} next={{ ...reset, course: courseKey, chapter: items[0].chapterKey }} save={{ topicKey: null }} navigate={navigate} className={styles.row}>
          <strong>{items[0].chapterTitle}</strong><span>{countLabel(items.length, "topic")}</span>
        </ArchiveLink>
      </li>)}
    </ul>
  </>;

  const toggle = () => {
    const showOtherCourses = !view.showOtherCourses;
    navigate({ ...reset, showOtherCourses }, { showOtherCourses, topicKey: null });
  };
  return <>
    <div className={styles.toolbar}>
      <h2>{view.showOtherCourses ? "Available courses" : "My courses"}</h2>
      <Button type="button" onClick={toggle}>{view.showOtherCourses ? "Show my courses" : "Show other courses"}</Button>
    </div>
    {!groups.length && <div className="card">
      <Empty>{view.showOtherCourses ? "There are no topics in your archive." : "None of your selected courses are in this archive."}</Empty>
      {!view.showOtherCourses && <ButtonLink href="/student#my-courses" prefetch={false}>Open My courses</ButtonLink>}
    </div>}
    <div className={styles.courses}>
      {groups.map(({ course, chapters }) => <section key={course.courseKey} className={styles.course}>
        <div className={styles.courseMeta}><span>{course.syllabus}</span><span>{countLabel(chapters.length, "chapter")}</span></div>
        <h3><ArchiveLink view={view} next={{ ...reset, course: course.courseKey, chapter: "" }} navigate={navigate}>{course.courseTitle}</ArchiveLink></h3>
        <ul>{chapters.map(items => <li key={items[0].chapterKey}>
          <ArchiveLink view={view} next={{ ...reset, course: course.courseKey, chapter: items[0].chapterKey }} navigate={navigate}>
            <span>{items[0].chapterTitle}</span><small>{countLabel(items.length, "topic")} <span aria-hidden="true">→</span></small>
          </ArchiveLink>
        </li>)}</ul>
      </section>)}
    </div>
  </>;
}

function ProblemIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6" /></svg>;
}

function PracticeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m13 2-8 12h6l-1 8 9-12h-6z" /></svg>;
}

function TopicDetail({ topic, overview, view, navigate, revision }: Shared & { topic: TopicNode }) {
  const params = new URLSearchParams({ page: String(view.page), originalPage: String(view.originalPage) });
  for (const key of filterKeys) if (view.filters[key]) params.set(key, view.filters[key]);
  const hasFilters = Object.values(view.filters).some(Boolean);
  const activity = view.topicActivity === "overview"
    ? topic.questionCounts.exam > 0 || hasFilters || !topic.questionCounts.practice ? "exam" : "practice"
    : view.topicActivity;
  if (activity === "exam") params.set("cards", "1");
  const result = useArchive<Topic & { cards?: Question[] }>("/topics/" + encodeURIComponent(topic.id) + "?" + params, revision);
  if (result?.error) return <Status error={result.error} />;
  const detail = result?.value;
  const originalQuestions = detail?.originalQuestions;
  const lessonPath = originalQuestions?.href;
  const cards = detail?.cards ?? [];
  return <>
    <nav className={styles.activityTabs} aria-label="Topic activities">
      <ArchiveLink view={view} next={{ topicActivity: "exam", page: 1 }} navigate={navigate} current={activity === "exam"} className={styles.pill}>
        <ProblemIcon />Exam-Style Problems <span>{topic.questionCounts.exam}</span>
      </ArchiveLink>
      <ArchiveLink view={view} next={{ topicActivity: "practice", originalPage: 1 }} navigate={navigate} current={activity === "practice"} className={styles.pill}>
        <PracticeIcon />Practice Questions <span>{topic.questionCounts.practice}</span>
      </ArchiveLink>
      {originalQuestions?.hasNotes && lessonPath && <ButtonLink href={lessonPath + "#notes"} prefetch={false}>Open Notes</ButtonLink>}
    </nav>
    {!detail || !originalQuestions ? <Loading /> : activity === "exam" ? <section className={styles.questions}>
      <TopicFilters key={JSON.stringify(view.filters)} view={view} papers={overview.papers.filter(paper => paper.syllabus === topic.syllabus)}
        onApply={filters => navigate({ filters, page: 1 })} />
      {cards.length ? <ExamArchiveQuestionList questions={cards} view={view} navigate={navigate} revision={revision} />
        : <Empty>{hasFilters ? "No exam questions match these filters." : "No past-paper questions are linked to this topic."}</Empty>}
      <Pagination page={detail.page} pages={Math.ceil(detail.total / detail.pageSize)} onChange={value => navigate({ page: value })} />
    </section> : <>
      <div className={styles.toolbar}>
        <h3>Practice Questions</h3>
        {lessonPath && <ButtonLink href={lessonPath + "#practice"} prefetch={false}>Open interactive practice</ButtonLink>}
      </div>
      {originalQuestions.items.length ? <>
        <div className={styles.questions}>
          {originalQuestions.items.map(item => <article key={item.id} className="card">
            <div className={styles.toolbar}><h4>{item.title}</h4><span className={styles.meta}>{countLabel(item.marks, "mark")}</span></div>
            <FullQuestion question={item.question} />
          </article>)}
        </div>
        <Pagination page={originalQuestions.page} pages={originalQuestions.pages} onChange={value => navigate({ originalPage: value })} />
      </> : <Empty>No original questions are linked to this topic.</Empty>}
    </>}
  </>;
}

function TopicFilters({ view, papers, onApply }: { view: View; papers: PaperRow[]; onApply: (filters: Filters) => void }) {
  const years = [...new Set(papers.map(paper => paper.year))].sort((a, b) => b - a);
  const sessions = [...new Set(papers.map(paper => paper.session))].sort(sessionSort);
  const codes = [...new Set(papers.map(paper => paper.paperCode))].sort(sortLabel);
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const filters = { ...emptyFilters };
    for (const key of filterKeys) filters[key] = String(data.get(key) ?? "");
    onApply(filters);
  }
  return <details className={styles.filters} open={Object.values(view.filters).some(Boolean)}>
    <summary>Filter exam-style problems</summary>
    <form onSubmit={apply} onReset={() => onApply(emptyFilters)}>
      <label>Paper<Select name="paper" defaultValue={view.filters.paper}><option value="">Any paper</option>{codes.map(code => <option key={code}>{code}</option>)}</Select></label>
      <label>Year<Select name="year" defaultValue={view.filters.year}><option value="">Any year</option>{years.map(year => <option key={year}>{year}</option>)}</Select></label>
      <label>Session<Select name="session" defaultValue={view.filters.session}><option value="">Any session</option>{sessions.map(session => <option key={session} value={session}>{sessionLabel(session)}</option>)}</Select></label>
      <label>Difficulty<Select name="difficulty" defaultValue={view.filters.difficulty}><option value="">Any difficulty</option>{[1, 2, 3, 4, 5].map(level => <option key={level}>{level}</option>)}</Select></label>
      <label>Minimum marks<Input type="number" name="minMarks" min="0" max="200" defaultValue={view.filters.minMarks} /></label>
      <label>Maximum marks<Input type="number" name="maxMarks" min="0" max="200" defaultValue={view.filters.maxMarks} /></label>
      <label>Question type<Select name="type" defaultValue={view.filters.type}>
        <option value="">Any type</option><option value="MC">Multiple choice</option><option value="SHORT">Short answer</option><option value="WRITTEN">Written</option>
      </Select></label>
      <div className={styles.filterActions}><Button type="submit" variant="primary">Apply</Button><Button type="reset">Clear</Button></div>
    </form>
  </details>;
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages < 2) return null;
  return <nav className={styles.pagination} aria-label="Pagination">
    <Button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
    <span>Page {page} of {pages}</span>
    <Button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
  </nav>;
}
