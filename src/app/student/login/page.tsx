import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

function safeNext(value?: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/student";
}

export default async function StudentLoginRedirectPage({ searchParams }: PageProps) {
  const { next } = await searchParams;

  redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
}
