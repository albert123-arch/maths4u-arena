import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { AppError } from "@/lib/errors";
import { requireExamArchiveAccess } from "@/lib/exam-archive";
import { ExamArchiveScreen } from "@/components/exam-archive-screen";
import styles from "@/components/exam-archive.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Exam archive | Maths4U",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function ArchivePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requestHeaders = await headers();
  const context = await requireExamArchiveAccess(new Request("https://arena.maths4u.sbs/exam-archive", { headers: requestHeaders })).catch(error => {
    if (error instanceof AppError && [401, 403, 404].includes(error.status)) return null;
    throw error;
  });
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) if (typeof value === "string") query.set(key, value);

  return <>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className="brand" href="/" prefetch={false}><span className="brand-symbol" aria-hidden="true">m</span>Maths4U</Link>
        {context && <Link href={context.admin ? "/admin" : "/student"} prefetch={false}>Dashboard</Link>}
      </div>
    </header>
    <main id="main-content" className="container">
      {context ? <ExamArchiveScreen initialQuery={query.toString()} /> : <section className={styles.gate}>
        <h1>Exam archive</h1>
        <p>Sign in with an account that has archive access.</p>
        <Link href="/login?next=%2Fexam-archive" className="ui-button ui-button--primary" prefetch={false}>Sign in</Link>
      </section>}
    </main>
  </>;
}
