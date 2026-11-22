"use client";

import Image from "next/image";
import { useState } from "react";
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
      {view.questionId ? <QuestionPanel key={view.questionId} view={view} navigate={navigate} revision={revision} />
        : <PaperDetail paperId={detail.id} view={view} navigate={navigate} revision={revision} />}
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
            <span>{countLabel(paper.questionCount, "question")} listed{paper.marks === null ? "" : " · " + countLabel(paper.marks, "mark") + " listed"}</span>
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
  const result = useArchive<Paper>("/papers/" + encodeURIComponent(paperId), revision);
  if (result?.error) return <Status error={result.error} />;
  if (!result?.value) return <Loading />;
  return <>
    <QuestionRows questions={result.value.questions} view={view} navigate={navigate} />
    <OfficialSource paper={result.value.paper} />
  </>;
}

function OfficialSource({ paper }: { paper: Pick<Paper["paper"], "syllabus" | "officialUrl" | "markSchemeUrl"> }) {
  const { syllabus, officialUrl, markSchemeUrl } = paper;
  if (officialUrl || markSchemeUrl) return <p className={styles.official}>
    {officialUrl && <a href={officialUrl} rel="noreferrer" target="_blank">Official question paper ↗</a>}
    {officialUrl && markSchemeUrl && " · "}
    {markSchemeUrl && <a href={markSchemeUrl} rel="noreferrer" target="_blank">Official mark scheme ↗</a>}
  </p>;
  const programme = programmes.find(item => item.code === syllabus);
  if (!programme) return null;
  return <p className={styles.official}><a href={"https://www.cambridgeinternational.org/programmes-and-qualifications/" + programme.cambridge + "/past-papers/"}
    rel="noreferrer" target="_blank">Cambridge past papers and mark schemes for {syllabus} ↗</a></p>;
}

export function QuestionRows({ questions, view, navigate, withSource }: {
  questions: Paper["questions"]; view: View; navigate: Navigate; withSource?: boolean;
}) {
  if (!questions.length) return <Empty>No exam references match this selection.</Empty>;
  return <ul className={styles.rows}>
    {questions.map(question => <li key={question.id}><ArchiveLink view={view} next={{ questionId: question.id }} navigate={navigate} className={styles.row}>
      <div><strong>Question {question.number}</strong>
        {withSource && question.sourceReference && <small>{question.sourceReference}</small>}
      </div>
      <span>{question.marks === null ? "Marks not recorded" : countLabel(question.marks, "mark")}</span>
    </ArchiveLink></li>)}
  </ul>;
}

export function QuestionPanel({ view, navigate, revision }: { view: View; navigate: Navigate; revision: number }) {
  const result = useArchive<Question>("/questions/" + encodeURIComponent(view.questionId), revision);
  const question = result?.value;
  const source = question?.papers.find(paper => paper.id === view.paperId) ?? question?.papers[0];
  return <section className={styles.questionPanel}>
    <ArchiveLink view={view} next={{ questionId: "", ...(view.mode === "topicwise" && { topicActivity: "exam" }) }} navigate={navigate} className={styles.backLink}>← {view.mode === "topicwise" ? "Exam-Style Problems" : "Questions"}</ArchiveLink>
    {result?.error ? <Status error={result.error} /> : !question ? <Loading /> : <article className="card">
      <h3>Question {source?.number ?? question.number}</h3>
      {source && <p className={styles.meta}>{source.syllabus} · {sessionLabel(source.session)} {source.year} · Paper {source.paperCode}</p>}
      {question.statementHtml ? <MathContent html={question.statementHtml} /> : <p>This entry contains a paper reference. Open the corresponding question in your authorised source.</p>}
      <ArchiveAssets assets={[...question.assets, ...question.legacyImages]} />
      {question.parts.map((part, index) => <section key={part.label + index} className={styles.part}>
        <div className={styles.toolbar}><h4>{part.label}</h4>{part.marks !== null && <span className={styles.meta}>{countLabel(part.marks, "mark")}</span>}</div>
        <MathContent html={part.html} />
        {part.options.length > 0 && <ul className={styles.options}>{part.options.map(option => <li key={option.label}>
          <strong>{option.label}</strong><MathContent html={option.html} />
        </li>)}</ul>}
      </section>)}
      {question.topics.length > 0 && <section className={styles.questionTopics}>
        <h4>Topics</h4>
        {question.topics.map(topic => <ArchiveLink key={topic.id} view={view}
          next={{ mode: "topicwise", topicKey: topic.id, questionId: "", topicActivity: "overview", filters: emptyFilters, originalPage: 1, page: 1 }} navigate={navigate}
          save={{ mode: "topicwise", topicKey: topic.id }}>{topic.title}</ArchiveLink>)}
      </section>}
      {question.support.solution && <SupportPanel questionId={view.questionId} kind="solution" revision={revision} />}
      {question.support.markScheme && <SupportPanel questionId={view.questionId} kind="mark-scheme" revision={revision} />}
      {question.legacyMarkSchemes.length > 0 && <details className={styles.support}>
        <summary>Mark scheme on Maths4U</summary>
        <ul>{question.legacyMarkSchemes.map(scheme => <li key={scheme.href}>
          <a href={scheme.href} rel="noreferrer" target="_blank">{scheme.caption || "Open mark scheme"} ↗</a>
        </li>)}</ul>
      </details>}
      {question.teacherNotesHtml && <details className={styles.support}><summary>Teacher notes</summary><MathContent html={question.teacherNotesHtml} /></details>}
      {question.sourceLinks.length > 0 && <p className={styles.official}>
        {question.sourceLinks.map((link, index) => <span key={link.href}>
          {index > 0 && " · "}<a href={link.href} rel="noreferrer" target="_blank">{link.caption} ↗</a>
        </span>)}
      </p>}
      {source && <OfficialSource paper={source} />}
    </article>}
  </section>;
}

function ArchiveAssets({ assets }: { assets: { href: string; caption: string }[] }) {
  return <>{assets.map(asset => <figure key={asset.href} className={styles.asset}>
    <Image src={asset.href} alt={asset.caption} unoptimized width={1000} height={750} referrerPolicy="no-referrer" />
    {asset.caption && <figcaption>{asset.caption}</figcaption>}
  </figure>)}</>;
}

function SupportPanel({ questionId, kind, revision }: { questionId: string; kind: "solution" | "mark-scheme"; revision: number }) {
  const [expanded, setExpanded] = useState(false);
  const result = useArchive<Support>(expanded ? "/questions/" + encodeURIComponent(questionId) + "/" + kind : null, revision);
  return <details className={styles.support} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary>{kind === "solution" ? "Worked solution" : "Mark scheme"}</summary>
    {expanded && (result?.error ? <Status error={result.error} /> : !result?.value ? <Loading /> : <>
      <MathContent html={result.value.html} /><ArchiveAssets assets={result.value.assets} />
    </>)}
  </details>;
}
