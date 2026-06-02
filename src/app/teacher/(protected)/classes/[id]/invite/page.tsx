import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassJoinCard } from "@/components/class-join-card";
import { CopyButton } from "@/components/copy-button";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function appBaseUrl() {
  return process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export default async function TeacherClassInvitePage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { id } = await params;
  const classroom = await prisma.classroom.findFirst({
    where: {
      id,
      teacherId: teacher.id,
      status: "ACTIVE",
    },
    include: {
      _count: {
        select: {
          memberships: true,
        },
      },
    },
  });

  if (!classroom) {
    notFound();
  }

  const joinLink = `${appBaseUrl()}/join-class/${classroom.joinCode}`;
  const instructions = `Open ${joinLink}, create or log in to your student account, then join ${classroom.title}.`;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <main className="mx-auto grid max-w-5xl gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={`/teacher/classes/${classroom.id}`} className="text-sm font-semibold text-teal-200">
              Back to class
            </Link>
            <p className="mt-3 text-sm font-semibold uppercase text-teal-200">Student invite</p>
            <h1 className="mt-1 text-4xl font-black sm:text-5xl">{classroom.title}</h1>
            {classroom.description ? <p className="mt-2 max-w-2xl text-slate-300">{classroom.description}</p> : null}
          </div>
          <div className="w-fit rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm">
            <p className="text-slate-300">Students joined</p>
            <p className="text-3xl font-black">{classroom._count.memberships}</p>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-stretch">
          <div className="rounded-md bg-white p-4 text-slate-950 shadow-xl">
            <ClassJoinCard joinCode={classroom.joinCode} joinLink={joinLink} />
          </div>
          <div className="grid gap-4 rounded-md border border-white/15 bg-white/10 p-6">
            <div>
              <p className="text-sm font-semibold uppercase text-teal-200">How to join</p>
              <h2 className="mt-2 text-3xl font-bold">Scan, create an account, join class.</h2>
            </div>
            <ol className="grid gap-3 text-lg text-slate-100">
              <li className="rounded-md bg-white/10 p-4">1. Scan the QR code or open the join link.</li>
              <li className="rounded-md bg-white/10 p-4">2. Create a student account or sign in.</li>
              <li className="rounded-md bg-white/10 p-4">3. Join the class and wait for live games or assignments.</li>
            </ol>
            <div className="grid gap-3 rounded-md bg-white p-4 text-slate-950">
              <p className="text-sm font-semibold">Join code</p>
              <p className="text-center text-6xl font-black tracking-[0.22em]">{classroom.joinCode}</p>
              <p className="break-all text-center text-sm text-slate-600">{joinLink}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <CopyButton value={joinLink} label={messages.host.copyJoinLink} />
                <CopyButton value={instructions} label="Copy instructions" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
