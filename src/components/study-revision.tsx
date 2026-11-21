import { MathContent } from "./ui";
import { ButtonLink } from "./controls";
import { PrintRevision } from "./print-revision";
import styles from "./study-revision.module.css";

export function StudyRevision({ title, revision, path, courseTitle, chapterTitle, returnSection = "review" }: {
  title: string; revision: { body: string; checks: string; examTip: string };
  path: string; courseTitle: string; chapterTitle: string; returnSection?: "notes" | "review";
}) {
  return <main className={styles.revisionPage}>
    <div className={styles.toolbar}>
      <ButtonLink href={path + "#" + returnSection}>← Back to the lesson</ButtonLink>
      <PrintRevision />
    </div>
    <article className={styles.sheet}>
      <header className={styles.heading}>
        <p>{courseTitle} · {chapterTitle} · Quick revision</p>
        <h1>{title}</h1>
      </header>
      <MathContent html={revision.body} />
      <div className={styles.reminders}>
        <aside className={styles.commonMistakes}>
          <h2>Check your answer</h2>
          <MathContent html={revision.checks} />
        </aside>
        <aside className={styles.examTip}>
          <h2>Exam tip</h2>
          <MathContent html={revision.examTip} />
        </aside>
      </div>
      <footer className={styles.footer}><span>Maths4U</span><span>arena.maths4u.sbs</span></footer>
    </article>
  </main>;
}
