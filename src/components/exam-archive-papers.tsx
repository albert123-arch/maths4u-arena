"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "./controls";
import { Empty, Loading, MathContent } from "./ui";
import { ArchiveLink, countLabel, emptyFilters, programmes, sessionLabel, sessionSort, sortLabel, Status, useArchive,
  type Navigate, type Paper, type Question, type Shared, type Support, type View } from "./exam-archive-navigation";
import styles from "./exam-archive.module.css";

export function PastPapers({ overview, view, navigate, revision }: Shared) {
  const programme = programmes.find(item => item.code === view.syllabus) ?? programmes.find(item => overview.papers.some(paper => paper.syllabus === item.code));
  const papers = overview.papers.filter(paper => paper.syllabus === programme?.code);
  const years = [...new Set(papers.map(paper => paper.year))].sort((a, b) => b - a);
  const detail = papers.find(paper => paper.id === view.paperId);
  const year = detail?.year ?? view.year;
  const session = detail?.session ?? view.session;
  const variants = papers.filter(paper => paper.year === year && paper.session === session).sort((a, b) => sortLabel(a.paperCode, b.paperCode));
  return <>
    <nav className={styles.programmes} aria-label="Examination programmes">
      {programmes.map(item => <ArchiveLink key={item.code} view={view}
        next={{ syllabus: item.code, year: null, session: null, paperId: null, questionId: "" }} navigate={navigate}
        save={{ syllabus: item.code, year: null, session: null, paperId: null }} current={item.code === programme?.code} className={styles.programme}>
        <strong>{item.code}</strong><span>{item.title}</span><small>{countLabel(overview.papers.filter(paper => paper.syllabus === item.code).length, "paper")}</small>
      </ArchiveLink>)}
    </nav>
    {!programme ? <Empty>No past papers are available in your archive.</Empty> : detail ? <>
      <nav aria-label="Paper path" className={styles.breadcrumbs}>
        <ArchiveLink view={view} next={{ syllabus: programme.code, year, session, paperId: null, questionId: "" }} navigate={navigate}
          save={{ syllabus: programme.code, year, session, paperId: null }}>← Papers</ArchiveLink>
      </nav>
      <h2>{programme.code} {sessionLabel(detail.session)} {detail.year} · Paper {detail.paperCode}</h2>
      <PaperDetail paperId={detail.id} view={view} navigate={navigate} revision={revision} />
    </> : variants.length && session ? <>
      <nav aria-label="Paper path" className={styles.breadcrumbs}>
        <ArchiveLink view={view} next={{ syllabus: programme.code, year: null, session: null, paperId: null, questionId: "" }} navigate={navigate}
          save={{ syllabus: programme.code, year: null, session: null, paperId: null }}>← Years</ArchiveLink>
      </nav>
      <h2>{programme.code} {sessionLabel(session)} {year}</h2>
      <ul className={styles.rows}>
        {variants.map(paper => <li key={paper.id}>
          <ArchiveLink view={view} next={{ syllabus: programme.code, year, session, paperId: paper.id, questionId: "" }}
            save={{ syllabus: programme.code, year, session, paperId: paper.id }} navigate={navigate} className={styles.row}>
            <strong>Question Paper {paper.paperCode}</strong>
            <span>{countLabel(paper.questionCount, "question")}{paper.marks === null ? "" : " · " + countLabel(paper.marks, "mark")}</span>
          </ArchiveLink>
        </li>)}
      </ul>
    </> : <>
      <h2>{programme.code} {programme.title}</h2>
      {years.length ? <p className={styles.muted}>Choose a year and session.</p> : <Empty>No papers are listed for this programme in your archive.</Empty>}
      <div className={styles.years}>
        {years.map(item => <section key={item} className={styles.year} aria-label={String(item)}>
          <h3>{item}</h3>
          {[...new Set(papers.filter(paper => paper.year === item).map(paper => paper.session))].sort(sessionSort).map(option =>
            <ArchiveLink key={option} view={view} next={{ syllabus: programme.code, year: item, session: option, paperId: null, questionId: "" }}
              save={{ syllabus: programme.code, year: item, session: option, paperId: null }} navigate={navigate} className={styles.pill}>{sessionLabel(option)}</ArchiveLink>)}
        </section>)}
      </div>
    </>}
  </>;
}

function PaperDetail({ paperId, view, navigate, revision }: { paperId: string; view: View; navigate: Navigate; revision: number }) {
  const result = useArchive<Paper & { cards: Question[] }>("/papers/" + encodeURIComponent(paperId) + "?cards=1", revision);
  if (result?.error) return <Status error={result.error} />;
  if (!result?.value) return <Loading />;
  const { cards, paper } = result.value;
  if (view.questionId && !cards.some(question => question.id === view.questionId)) {
    return <QuestionPanel key={view.questionId} view={view} navigate={navigate} revision={revision} />;
  }
  return <>
    <ExamArchiveQuestionList questions={cards} view={view} navigate={navigate} revision={revision} jumpToQuestions />
    {paper.officialUrl && <p className={styles.official}>
      <a href={paper.officialUrl} rel="noreferrer" target="_blank">Official question paper ↗</a>
    </p>}
  </>;
}

const questionAnchor = (id: string) => "archive-question-" + id;

export function ExamArchiveQuestionList({ questions, view, navigate, revision, jumpToQuestions }: {
  questions: Question[]; view: View; navigate: Navigate; revision: number; jumpToQuestions?: boolean;
}) {
  const selected = view.questionId;
  useEffect(() => {
    if (selected) document.getElementById(questionAnchor(selected))?.scrollIntoView();
  }, [questions, selected]);

  if (!questions.length) return <Empty>No exam questions match this selection.</Empty>;
  return <>
    {jumpToQuestions && <nav className={styles.numberJumps} aria-label="Jump to a question">
      {questions.map(question => <a key={question.id} href={"#" + questionAnchor(question.id)}
        aria-label={"Question " + question.number} className={styles.pill}>Q{question.number}</a>)}
    </nav>}
    <div className={styles.questions}>
      {questions.map(question => <ExamArchiveQuestionCard key={question.id} question={question}
        view={view} navigate={navigate} revision={revision} showTopicLinks={jumpToQuestions} />)}
    </div>
  </>;
}

export function QuestionPanel({ view, navigate, revision }: { view: View; navigate: Navigate; revision: number }) {
  const result = useArchive<Question>("/questions/" + encodeURIComponent(view.questionId), revision);
  return <section className={styles.questionPanel}>
    <ArchiveLink view={view} next={{ questionId: "", ...(view.mode === "topicwise" && { topicActivity: "exam" }) }} navigate={navigate} className={styles.backLink}>← {view.mode === "topicwise" ? "Exam-Style Problems" : "Questions"}</ArchiveLink>
    {result?.error ? <Status error={result.error} /> : !result?.value ? <Loading /> :
      <ExamArchiveQuestionCard question={result.value} view={view} navigate={navigate} revision={revision} showTopicLinks />}
  </section>;
}

function ExamArchiveQuestionCard({ question, view, navigate, revision, showTopicLinks }: {
  question: Question; view: View; navigate: Navigate; revision: number; showTopicLinks?: boolean;
}) {
  const selectedPaper = view.mode === "past-papers" ? question.papers.find(paper => paper.id === view.paperId) : undefined;
  const source = selectedPaper
    ? selectedPaper.syllabus + " · " + sessionLabel(selectedPaper.session) + " " + selectedPaper.year + " · Paper " + selectedPaper.paperCode
    : question.sourceReference?.replace(/ · Question [^·]+$/, "");
  const number = selectedPaper?.number ?? question.number;
  const anchor = questionAnchor(question.id);
  const hasPrompt = question.statementHtml || question.parts.length > 0;
  const hasSupport = question.support.solution || question.support.markScheme || question.legacyMarkSchemes.length > 0;
  return <article id={anchor} className={"card " + styles.questionCard} aria-labelledby={anchor + "-title"}>
    <header className={styles.questionHeader}>
      <div>
        <h3 id={anchor + "-title"}>{number ? "Question " + number : "Question"}</h3>
        {source && <p className={styles.meta}>{source}</p>}
      </div>
      {question.marks !== null && <span className={styles.meta}>{countLabel(question.marks, "mark")}</span>}
    </header>
    {question.statementHtml && <MathContent html={question.statementHtml} />}
    {!hasPrompt && <p>This question is available in the source paper.</p>}
    <ArchiveAssets assets={[...question.assets, ...question.legacyImages]} />
    {question.parts.map((part, index) => <section key={part.label + index} className={styles.part}>
      <div className={styles.toolbar}><h4>{part.label}</h4>{part.marks !== null && <span className={styles.meta}>{countLabel(part.marks, "mark")}</span>}</div>
      <MathContent html={part.html} />
      {part.options.length > 0 && <ul className={styles.options}>{part.options.map(option => <li key={option.label}>
        <strong>{option.label}</strong><MathContent html={option.html} />
      </li>)}</ul>}
    </section>)}
    {hasSupport && <SolutionPanel question={question} revision={revision} elementId={anchor + "-solution"} />}
    {showTopicLinks && question.topics.length > 0 && <div className={styles.questionTopics}>
      {question.topics.map(topic => <ArchiveLink key={topic.id} view={view}
        next={{ mode: "topicwise", topicKey: topic.id, questionId: "", topicActivity: "exam", filters: emptyFilters, originalPage: 1, page: 1 }} navigate={navigate}
        save={{ mode: "topicwise", topicKey: topic.id }}>{topic.title}</ArchiveLink>)}
    </div>}
    {question.teacherNotesHtml && <details className={styles.support}><summary>Teacher notes</summary><MathContent html={question.teacherNotesHtml} /></details>}
    {!hasPrompt && question.sourceLinks.length > 0 && <p className={styles.official}>
      {question.sourceLinks.map((link, index) => <span key={link.href}>
        {index > 0 && " · "}<a href={link.href} rel="noreferrer" target="_blank">{link.caption} ↗</a>
      </span>)}
    </p>}
  </article>;
}

function ArchiveAssets({ assets }: { assets: { href: string; caption: string }[] }) {
  const unique = [...new Map(assets.map(asset => [asset.href, asset])).values()];
  return <>{unique.map(asset => <figure key={asset.href} className={styles.asset}>
    <Image src={asset.href} alt={asset.caption} unoptimized width={1000} height={750} referrerPolicy="no-referrer" />
    {asset.caption && <figcaption>{asset.caption}</figcaption>}
  </figure>)}</>;
}

function SolutionPanel({ question, revision, elementId }: { question: Question; revision: number; elementId: string }) {
  const [expanded, setExpanded] = useState(false);
  const resourcePath = "/questions/" + encodeURIComponent(question.id);
  const solution = useArchive<Support>(expanded && question.support.solution ? resourcePath + "/solution" : null, revision);
  const marking = useArchive<Support>(expanded && question.support.markScheme ? resourcePath + "/mark-scheme" : null, revision);
  const legacyImages = question.legacyMarkSchemes.filter(asset => !/\.pdf$/i.test(asset.href));
  const hasMarking = question.support.markScheme || question.legacyMarkSchemes.length > 0;
  return <div>
    <Button type="button" className={styles.solutionToggle} aria-expanded={expanded} aria-controls={elementId}
      onClick={() => setExpanded(value => !value)}>Solution</Button>
    <div id={elementId} className={expanded ? styles.solutionBody : undefined} hidden={!expanded}>
      {expanded && <>
        {question.support.solution && <SupportContent result={solution} />}
        {hasMarking && <section>
          <h4>Mark scheme</h4>
          {question.support.markScheme && <SupportContent result={marking} additionalAssets={legacyImages} />}
          {!question.support.markScheme && <ArchiveAssets assets={legacyImages} />}
          {legacyImages.length < question.legacyMarkSchemes.length && <p>PDF mark scheme preview unavailable.</p>}
        </section>}
      </>}
    </div>
  </div>;
}

function SupportContent({ result, additionalAssets = [] }: {
  result: ReturnType<typeof useArchive<Support>>; additionalAssets?: Support["assets"];
}) {
  return <>
    {result?.error ? <Status error={result.error} /> : !result?.value ? <Loading /> :
      result.value.html && <MathContent html={result.value.html} />}
    <ArchiveAssets assets={[...(result?.value?.assets ?? []), ...additionalAssets]} />
  </>;
}
