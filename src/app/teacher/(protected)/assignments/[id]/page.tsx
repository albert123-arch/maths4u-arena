import Link from "next/link";
import { notFound } from "next/navigation";

import { AssignmentActions } from "@/components/assignment-actions";
import { AssignmentForm } from "@/components/assignment-form";
import { requireTeacherUser } from "@/lib/auth";
import { toDatetimeLocalValue } from "@/lib/assignments";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherAssignmentDetailPage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { id } = await params;
  const [assignment, classes, tests] = await Promise.all([
    prisma.assignment.findFirst({
      where: { id, teacherId: teacher.id },
      include: {
        classroom: {
          include: {
            _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
          },
        },
        testVersion: {
          include: {
            test: { select: { title: true } },
            _count: { select: { questions: true } },
          },
        },
        submissions: { select: { status: true } },
      },
    }),
    prisma.classroom.findMany({
      where: { teacherId: teacher.id, status: "ACTIVE" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.test.findMany({
      where: { ownerUserId: teacher.id, status: { not: "ARCHIVED" } },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { versionNumber: "desc" },
          select: {
            id: true,
            title: true,
            versionNumber: true,
            _count: { select: { questions: true } },
          },
        },
      },
    }),
  ]);

  if (!assignment) {
    notFound();
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const studentLink = `${appUrl}/student/assignments/${assignment.id}`;
  const submittedCount = assignment.submissions.filter((submission) =>
    ["SUBMITTED", "GRADED", "RETURNED"].includes(submission.status),
  ).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/teacher/assignments" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            Back to assignments
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{assignment.title}</h1>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {assignment.status}
            </span>
            <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
              {assignment.type.replace("_", " ")}
            </span>
          </div>
          {assignment.description ? <p className="mt-2 text-slate-600">{assignment.description}</p> : null}
        </div>
        <Link
          href={`/teacher/assignments/${assignment.id}/results`}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          Results
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <InfoCard label="Class" value={assignment.classroom.title} />
        <InfoCard label="Test" value={assignment.testVersion.test.title} />
        <InfoCard label="Questions" value={assignment.testVersion._count.questions} />
        <InfoCard label="Submitted" value={`${submittedCount} / ${assignment.submissions.length}`} />
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Assignment controls</h2>
        <p className="mt-2 text-sm text-slate-600">
          Student link: <span className="font-semibold">{studentLink}</span>
        </p>
        <div className="mt-4">
          <AssignmentActions assignmentId={assignment.id} status={assignment.status} studentLink={studentLink} />
        </div>
      </section>

      {assignment.status === "DRAFT" ? (
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Edit draft</h2>
          <AssignmentForm
            mode="edit"
            classes={classes}
            tests={tests}
            initial={{
              id: assignment.id,
              title: assignment.title,
              description: assignment.description,
              classId: assignment.classId,
              testVersionId: assignment.testVersionId,
              type: assignment.type,
              openAt: toDatetimeLocalValue(assignment.openAt),
              dueAt: toDatetimeLocalValue(assignment.dueAt),
              timeLimitMinutes: assignment.timeLimitMinutes,
              attemptsAllowed: assignment.attemptsAllowed,
              showResultsToStudents: assignment.showResultsToStudents,
              showCorrectAnswers: assignment.showCorrectAnswers,
              allowLateSubmission: assignment.allowLateSubmission,
              allowPhotoSolutions: assignment.allowPhotoSolutions,
              settingsJson: assignment.settingsJson,
            }}
          />
        </section>
      ) : (
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Assigned settings</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <p>Opens at: {assignment.openAt ? assignment.openAt.toLocaleString() : "Any time"}</p>
            <p>Due at: {assignment.dueAt ? assignment.dueAt.toLocaleString() : "No due date"}</p>
            <p>Time limit: {assignment.timeLimitMinutes ? `${assignment.timeLimitMinutes} minutes` : "None"}</p>
            <p>Attempts allowed: {assignment.attemptsAllowed}</p>
            <p>Show results: {assignment.showResultsToStudents ? "Yes" : "No"}</p>
            <p>Show correct answers: {assignment.showCorrectAnswers ? "Yes" : "No"}</p>
            <p>Allow late submission: {assignment.allowLateSubmission ? "Yes" : "No"}</p>
            <p>Photo solutions: {assignment.allowPhotoSolutions ? "Placeholder enabled" : "Off"}</p>
          </div>
        </section>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
