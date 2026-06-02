import { AdminTeachersManager } from "@/components/admin-teachers-manager";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTeachersPage() {
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          classrooms: true,
          ownedTests: true,
          questions: true,
        },
      },
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.adminTeachers.title}</h1>
        <p className="mt-2 text-slate-600">{messages.adminTeachers.description}</p>
      </div>
      <AdminTeachersManager teachers={teachers} />
    </div>
  );
}
