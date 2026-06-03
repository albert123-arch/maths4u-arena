import Link from "next/link";

import { PersonalResultsClient } from "@/components/personal-results-client";
import { messages } from "@/lib/messages";
import { getCurrentStudent } from "@/lib/student-auth";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function GameResultsPage({ params }: PageProps) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();
  const student = await getCurrentStudent();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-4xl gap-6">
        <Link href="/student" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.student.backToDashboard}
        </Link>
        <PersonalResultsClient code={normalizedCode} allowAccountLookup={Boolean(student)} />
      </section>
    </main>
  );
}
