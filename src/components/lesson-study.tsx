"use client";

import Link from "next/link";
import Image from "next/image";
import { useId, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Button, ButtonLink, Input } from "./controls";
import { api, MathContent } from "./ui";
import { useView } from "./view-state";
import { answerFormat } from "@/lib/square-presentation";
import type { SquareExample, SquareLesson } from "@/lib/square-model";
import type { StudyBlock, StudyCheck, StudyCheckResult, StudyLesson, StudySection } from "@/lib/study-lesson-model";
import styles from "./lesson-study.module.css";

const levelNames = { core: "Core", further: "Further applications", extension: "Extension" };
const level = (section: StudySection) => levelNames[section.level];
const sectionInfo = (section: StudySection) => level(section) + " · about " + section.minutes + " min";
const exampleAnchor = (index: number) => "worked-example-" + (index + 1);
const subscribeToHydration = () => () => {};
type StudyTeaching = { topic: Pick<SquareLesson["topic"], "path" | "lessonId">; examples: SquareLesson["examples"] };

export function LessonStudy({ lesson, study, activeId, children }: {
  lesson: StudyTeaching; study: StudyLesson; activeId: string; children?: ReactNode;
}) {
  const { sections, glossary, related } = study;
  const interactive = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const selected = Math.max(0, sections.findIndex(section => section.id === activeId));
  const totalMinutes = sections.reduce((sum, section) => sum + section.minutes, 0);
  const extensionMinutes = sections.reduce((sum, section) => sum + (section.level === "extension" ? section.minutes : 0), 0);
  const duration = extensionMinutes
    ? (totalMinutes - extensionMinutes) + " min Core + " + extensionMinutes + " min Extension"
    : "About " + totalMinutes + " min";
  const revision = lesson.topic.path + "?view=revision";
  const revisionLink = <ButtonLink href={revision} className={styles.revisionLink}>Quick revision sheet (A4)</ButtonLink>;
  function contents() {
    return <nav aria-label="In this lesson"><ol className={styles.contents}>
      {sections.map((section, index) => (
        <li key={section.id}>
          <a href={"#" + section.id}
            aria-current={index === selected ? "location" : undefined}
            onClick={event => event.currentTarget.closest("details")?.removeAttribute("open")}>
            <span className={styles.sectionNumber} aria-hidden="true">{index + 1}</span>
            <span>{section.label}<small>{level(section)} · {section.minutes} min</small></span>
          </a>
        </li>
      ))}
    </ol></nav>;
  }
  const words = <dl className={styles.glossaryList}>{glossary.map(word => (
    <div key={word.term}>
      <dt>{word.term}</dt>
      <dd><MathContent html={word.definition} /></dd>
    </div>
  ))}</dl>;
  return <section id="notes" className={styles.notesLayout} aria-label="Lesson notes" data-interactive={interactive ? "" : undefined}>
    <aside className={styles.sidebar}>
      <div className={styles.desktopContents}>
        <div className={"card " + styles.sidebarCard}>
          <div className={styles.contentsHeading}><strong>In this lesson</strong><span>{duration}</span></div>
          {contents()}
          {revisionLink}
        </div>
        <div className={"card " + styles.sidebarCard}><strong>Key words</strong>{words}</div>
      </div>
      <details className={styles.mobileContents}>
        <summary>Section {selected + 1} of {sections.length} · {sectionInfo(sections[selected])}</summary>
        {extensionMinutes > 0 && <p>{duration}</p>}
        {contents()}
        <details className={styles.mobileGlossary}><summary>Key words</summary>{words}</details>
        {revisionLink}
      </details>
    </aside>
    <div className={styles.reading}>
      {sections.map((section, index) => {
        const previous = sections[index - 1], next = sections[index + 1];
        return <section key={section.id} id={section.id} className={styles.noteSection} tabIndex={-1} aria-labelledby={section.id + "-title"}>
          <header className={styles.sectionHeading}>
            {section.previousIds?.map(id => <span key={id} id={id} className={styles.previousSectionAnchor} aria-hidden="true" />)}
            <p>Section {index + 1} of {sections.length} · {sectionInfo(section)}</p>
            <h2 id={section.id + "-title"}>{section.title}</h2>
            <MathContent html={section.intro} />
          </header>
          {section.blocks.map((block, i) => (
            <LessonBlock key={block.kind === "check" ? block.id : i} block={block} lesson={lesson} />
          ))}
          {index === sections.length - 1 && children}
          {index === sections.length - 1 && related?.length ? (
            <nav aria-label="Related topics" className={styles.related}>
              <strong>You’ll use this again</strong>
              {related.map(link => <Link key={link.href} href={link.href}>{link.title}</Link>)}
            </nav>
          ) : null}
          <nav aria-label={section.label + " navigation"} className={styles.sectionNavigation}>
            {previous && <a className="ui-button ui-button--outline" href={"#" + previous.id}>{"← " + previous.label}</a>}
            {next?.level === "extension" && <a className="ui-button ui-button--outline" href={"#" + next.id}>{"Extension · " + next.label + " →"}</a>}
            {next && next.level !== "extension"
              ? <a className="ui-button ui-button--primary" href={"#" + next.id}>{"Next · " + next.label + " →"}</a>
              : <a className="ui-button ui-button--primary" href="#practice">Go to practice →</a>}
          </nav>
        </section>;
      })}
    </div>
  </section>;
}

export function StudyExampleList({ study, examples }: { study: StudyLesson; examples: SquareExample[] }) {
  return <div className={styles.exampleIndex}>
    {study.sections.map(section => {
      const items = section.blocks.filter(block => block.kind === "example");
      if (!items.length) return null;
      return <div key={section.id}>
        <h3>{section.label}</h3>
        <ul>{items.map(item => <li key={item.index}><a href={"#" + exampleAnchor(item.index)}>{examples[item.index].title}</a></li>)}</ul>
      </div>;
    })}
  </div>;
}

const labels = { key: "Key idea", mistake: "Common mistake", tip: "Exam tip" };
function LessonBlock({ block, lesson }: { block: StudyBlock; lesson: StudyTeaching }) {
  switch (block.kind) {
    case "example":
      return <ExampleSteps example={lesson.examples[block.index]} id={exampleAnchor(block.index)} tryFirst={block.tryFirst} />;
    case "check":
      return <YourTurn check={block} lessonId={lesson.topic.lessonId} />;
    case "further":
      return <details className={"card " + styles.further}><summary>{block.title}</summary><MathContent html={block.html} /></details>;
    case "text":
      return <div id={block.id} className={"card " + styles.method} tabIndex={block.id ? -1 : undefined}>
        {block.title && <h3>{block.title}</h3>}
        <MathContent html={block.html} />
      </div>;
    default: {
      const callout = <aside className={styles.callout} data-tone={block.kind}>
        <strong>{labels[block.kind]}</strong>
        <MathContent html={block.html} />
      </aside>;
      if (!block.figure) return callout;
      const { src, alt, caption, width, height } = block.figure;
      return <div className={styles.illustrated}>
        {callout}
        <figure className={styles.figure}>
          <Image src={src} alt={alt} width={width} height={height} unoptimized />
          <figcaption><MathContent html={caption} /></figcaption>
        </figure>
      </div>;
    }
  }
}

function ExampleSteps({ example, id, tryFirst }: { example: SquareExample; id: string; tryFirst?: boolean }) {
  const steps = example.steps ?? [example.solution];
  const initial = tryFirst ? 0 : 1;
  const [shown, setShown] = useState(initial);
  const complete = shown === steps.length;
  return <article id={id} tabIndex={-1} className={styles.example}>
    <p className={styles.eyebrow}>Worked example</p>
    <h3>{example.title}</h3>
    <MathContent html={example.question} />
    {tryFirst && shown === 0 && <p className={styles.tryFirst}>Try it on paper first.</p>}
    <ol className={styles.steps} id={id + "-steps"} aria-live="polite" data-pending={shown === 0 ? "" : undefined}>
      {steps.map((step, i) => <li key={i} data-pending={i >= shown ? "" : undefined}><MathContent html={step} /></li>)}
    </ol>
    {steps.length > initial && <div className={styles.actions}>
      <Button type="button" variant={complete ? "outline" : "primary"} aria-controls={id + "-steps"}
        onClick={() => setShown(complete ? initial : shown + 1)}>
        {complete ? (tryFirst ? "Hide steps" : "Back to first step") : shown === 0 ? "Show first step" : "Show next step"}
      </Button>
      {!complete && steps.length - shown > 1 && <Button type="button" aria-controls={id + "-steps"} onClick={() => setShown(steps.length)}>Show all steps</Button>}
    </div>}
  </article>;
}

export function ExtraStudyPractice({ checks, lessonId }: { checks: StudyCheck[]; lessonId: string }) {
  return <details className={styles.extraPractice}>
    <summary>Extra practice from this lesson</summary>
    <div>{checks.map(check => <YourTurn key={check.id} check={check} lessonId={lessonId} supplementary />)}</div>
  </details>;
}

export function StudyWrittenQuestions({ questions }: { questions: NonNullable<StudyLesson["examPractice"]>["starters"] }) {
  return questions.map(q => <details key={q.id} id={q.id} className="exam-starter">
    <summary><strong>{q.title}</strong> <span className="muted">{q.marks} marks</span></summary>
    <MathContent html={q.question} />
    {q.hint && <details><summary>Hint</summary><MathContent html={q.hint} /></details>}
    <details><summary>Worked solution</summary><MathContent html={q.solution} /></details>
    {q.marking && <details><summary>Marking guidance</summary><MathContent html={q.marking} /></details>}
  </details>);
}

function YourTurn({ check, lessonId, supplementary = false }: { check: StudyCheck; lessonId: string; supplementary?: boolean }) {
  const id = useId(), lens = useView();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hint, setHint] = useState(false);
  const [result, setResult] = useState<StudyCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const preview = lens?.mode === "USER";
  const { fields } = check;
  const simple = fields.length === 1 && fields[0].type !== "choice";
  const complete = fields.every(field => answers[field.key]?.trim());
  const actions = <>
    <Button variant="primary" disabled={busy || preview || !complete} type="submit">{busy ? "Checking…" : "Check"}</Button>
    <Button type="button" aria-expanded={hint} aria-controls={id + "-hint"} onClick={() => setHint(!hint)}>Hint</Button>
  </>;
  function change(key: string, value: string) {
    setAnswers(current => ({ ...current, [key]: value }));
    setResult(null);
    setFailed(false);
  }
  return <form className={styles.yourTurn} aria-label={(check.title ?? fields[0].label) + " quick check"} data-study-check={check.id}
    onSubmit={async event => {
      event.preventDefault();
      if (busy || preview || !complete) return;
      setBusy(true);
      setFailed(false);
      try {
        const values = fields.length === 1 ? { answer: answers[fields[0].key] } : { answers };
        setResult(await api<StudyCheckResult>("learning/study-check", "POST", { lessonId, id: check.id, ...values }));
      } catch {
        setFailed(true);
      } finally {
        setBusy(false);
      }
    }}>
    <h3>{supplementary ? check.title : "Your turn"}</h3>
    <MathContent html={check.prompt} />
    <noscript><p>Work out your answer on paper. Enable JavaScript to check it here.</p></noscript>
    {fields.map(field => {
      const fieldId = id + "-" + field.key;
      const format = answerFormat(field);
      const label = field.labelHtml ? <span dangerouslySetInnerHTML={{ __html: field.labelHtml }} /> : field.label;
      if (field.options) return <fieldset key={field.key} className={styles.checkChoices}>
        <legend>{label}</legend>
        {Object.entries(field.options).map(([value, html]) => <label key={value}>
          <Input type="radio" name={fieldId} value={value} checked={answers[field.key] === value}
            disabled={busy || preview} onChange={() => change(field.key, value)} />
          <MathContent html={html} />
        </label>)}
      </fieldset>;
      return <div key={field.key}>
        <label htmlFor={fieldId}>{label}</label>
        <div className={simple ? styles.answerRow : styles.studyInput}>
          <Input id={fieldId} value={answers[field.key] ?? ""} readOnly={busy || preview} required maxLength={400}
            autoComplete="off" spellCheck={false} placeholder={field.inverseAngle ? "Exact value" : format.placeholder}
            aria-describedby={fieldId + "-format " + id + "-result"}
            aria-invalid={simple && result ? result.status !== "correct" : undefined}
            onChange={event => change(field.key, event.target.value)} />
          {simple && actions}
        </div>
        <p className={styles.format} id={fieldId + "-format"}>{field.inverseAngle
          ? (field.type === "set" ? "Give all exact angles. You can type asin, acos or atan." : "Give the exact angle. You can type asin, acos or atan.")
          : format.en}</p>
      </div>;
    })}
    {!simple && <div className={styles.actions}>{actions}</div>}
    <div className={styles.hint} id={id + "-hint"} hidden={!hint}><MathContent html={check.hint} /></div>
    <div id={id + "-result"} aria-live="polite">
      {result && <div className={styles.checkResult} data-status={result.status}>
        <strong>{result.status === "correct" ? "Correct" : result.status === "format" ? "Check the format" : "Try again"}</strong>
        <MathContent html={result.feedback} />
      </div>}
      {failed && <p className={styles.checkResult} data-status="retry">The answer could not be checked. Try again.</p>}
    </div>
  </form>;
}
