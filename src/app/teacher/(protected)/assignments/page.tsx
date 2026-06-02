import { messages } from "@/lib/messages";

export default function TeacherAssignmentsPage() {
  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">{messages.teacher.assignmentsTitle}</h1>
        <p className="mt-3 text-slate-600">{messages.teacher.assignmentsDescription}</p>
      </section>
    </div>
  );
}
