import Link from "next/link";

import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ classId?: string; q?: string }>;
};

export default async function TeacherStudentsPage({ searchParams }: PageProps) {
  const teacher = await requireTeacherUser();
  const { classId = "", q = "" } = await searchParams;
  const classes = await prisma.classroom.findMany({
    where: { teacherId: teacher.id, status: "ACTIVE" },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
  const memberships = await prisma.classMembership.findMany({
    where: {
      status: "ACTIVE",
      ...(classId ? { classId } : {}),
      classroom: { teacherId: teacher.id },
      ...(q
        ? {
            OR: [
              { student: { displayName: { contains: q } } },
              { student: { username: { contains: q } } },
              { student: { groupName: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy: [{ classroom: { title: "asc" } }, { student: { displayName: "asc" } }],
    include: {
      classroom: { select: { id: true, title: true } },
      student: {
        select: {
          id: true,
          username: true,
          displayName: true,
          groupName: true,
          status: true,
        },
      },
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.teacher.myStudents}</h1>
        <p className="mt-2 text-slate-600">{messages.teacher.teacherStudentsDescription}</p>
      </div>
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.teacher.filterByClass}
          <select name="classId" defaultValue={classId} className="rounded-md border border-slate-300 px-3 py-2">
            <option value="">{messages.teacher.allClasses}</option>
            {classes.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.teacher.searchStudents}
          <input name="q" defaultValue={q} className="rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <div className="flex items-end">
          <button type="submit" className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800">
            {messages.common.view}
          </button>
        </div>
      </form>
      {memberships.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
          {messages.teacher.noStudents}
        </p>
      ) : (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">{messages.students.displayName}</th>
                <th className="px-4 py-3 font-semibold">{messages.students.username}</th>
                <th className="px-4 py-3 font-semibold">{messages.students.groupName}</th>
                <th className="px-4 py-3 font-semibold">{messages.teacher.myClasses}</th>
                <th className="px-4 py-3 font-semibold">{messages.host.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {memberships.map((membership) => (
                <tr key={membership.id}>
                  <td className="px-4 py-3 font-medium">{membership.student.displayName}</td>
                  <td className="px-4 py-3">{membership.student.username}</td>
                  <td className="px-4 py-3">{membership.student.groupName ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/teacher/classes/${membership.classroom.id}`} className="font-semibold text-teal-800">
                      {membership.classroom.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{membership.student.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
