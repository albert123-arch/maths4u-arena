import { AdminStudentsManager } from "@/components/admin-students-manager";
import { MigrationRequiredNotice } from "@/components/migration-required-notice";
import { isStudentSeriesMigrationError } from "@/lib/migration-warning";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStudents() {
  try {
    const students = await prisma.studentAccount.findMany({
      orderBy: [{ groupName: "asc" }, { displayName: "asc" }],
      select: {
        id: true,
        username: true,
        displayName: true,
        groupName: true,
        status: true,
        _count: {
          select: {
            registrations: true,
            participants: true,
          },
        },
      },
    });

    return {
      migrationRequired: false,
      students,
    };
  } catch (error) {
    if (isStudentSeriesMigrationError(error)) {
      return {
        migrationRequired: true,
        students: [],
      };
    }

    throw error;
  }
}

export default async function AdminStudentsPage() {
  const result = await getStudents();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.students.title}</h1>
        <p className="mt-2 text-slate-600">{messages.students.description}</p>
      </div>
      {result.migrationRequired ? (
        <MigrationRequiredNotice />
      ) : (
        <AdminStudentsManager students={result.students} />
      )}
    </div>
  );
}
