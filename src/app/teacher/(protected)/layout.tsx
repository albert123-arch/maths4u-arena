import { TeacherShell } from "@/components/teacher-shell";
import { requireTeacherUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeacherProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireTeacherUser();

  return <TeacherShell user={user}>{children}</TeacherShell>;
}
