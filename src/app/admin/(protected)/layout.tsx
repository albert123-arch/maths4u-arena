import { AdminShell } from "@/components/admin-shell";
import { requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminUser();

  return <AdminShell user={user}>{children}</AdminShell>;
}
