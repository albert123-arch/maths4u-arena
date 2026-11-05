import { Platform } from "@/components/platform";
import { publicDiscovery } from "@/lib/discovery";
import { learningDirections, type DiscoveryData } from "@/lib/discovery-model";
import type { DiscoveryProps } from "@/components/discovery-home";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { quadraticTopics } from "@/lib/square-model";
import { squarePublicLesson } from "@/lib/square-content";
import { squareMappings } from "@/lib/square-learning";

type Props = { params: Promise<{ page?: string[] }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };
const origin = "https://arena.maths4u.sbs";
function discoveryRoute(parts: string[]): Omit<DiscoveryProps, "data"> | null {
  if (!parts.length) return { view: "home" };
  if (parts.length === 1 && parts[0] === "search") return { view: "search" };
  if (parts.length === 1 && parts[0] === "for-teachers") return { view: "teachers" };
  if (parts[0] === "learn") {
    const direction = parts.length === 2 && learningDirections.find(d => d.key === parts[1]);
    if (!direction) notFound();
    return { view: "direction", direction: direction.key };
  }
  return null;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parts = (await params).page ?? [], route = discoveryRoute(parts);
  const topic = quadraticTopics.find(t=>t.path === "/" + parts.join("/"));
  if (topic) return { title: topic.title + ": notes, exact-answer practice & review | Maths4U", description: topic.summary + " Worked examples, original problems and full-answer checking with spaced review.", alternates: { canonical: origin + topic.path }, ...(process.env.MATHS4U_ENV !== "production" ? { robots: { index: false, follow: true } } : {}) };
  if (route) {
    const direction = learningDirections.find(d => d.key === route.direction);
    const title = direction ? direction.title + " · Courses and practice | Maths4U" : route.view === "search" ? "Search courses and topics | Maths4U" : route.view === "teachers" ? "Maths teaching tools and classwork | Maths4U" : "Learn mathematics, practise and prepare for exams | Maths4U";
    const description = direction?.description ?? "Learn mathematics with clear explanations, worked examples and practice. Explore Cambridge IGCSE, Additional Mathematics, A Level, Further Mathematics and school topics.";
    return { title, description, alternates: { canonical: origin + (parts.length ? "/" + parts.join("/") : "/") }, ...(route.view === "search" || process.env.MATHS4U_ENV !== "production" ? { robots: { index: false, follow: true } } : {}), openGraph: { title, description, url: origin + (parts.length ? "/" + parts.join("/") : "/"), siteName: "Maths4U", type: "website" } };
  }
  // Preserve existing index policy. Give current public course/topic URLs their
  // real titles; do not turn every legacy material into noindex during redesign.
  if (parts[0] === "courses" && (parts.length === 2 || parts.length === 4 && parts[2] === "topics")) {
    await connection();
    try {
      const data = await publicDiscovery(), item = data.items.find(i => i.href === "/" + parts.map(encodeURIComponent).join("/"));
      if (item) return { title: item.title + (item.kind === "topic" ? " · " + item.course : "") + " | Maths4U", description: "Study " + item.title + ". Explore the available explanations, practice questions and worked solutions on Maths4U.", alternates: { canonical: origin + item.href } };
    } catch { /* The application retains its existing unavailable/error state. */ }
  }
  return {};
}
export default async function Page({ params, searchParams }: Props) {
  const parts = (await params).page ?? [], route = discoveryRoute(parts);
  const search = await searchParams;
  const oldPracticeLink = typeof search.reviewTask === "string" || typeof search.mode === "string" && ["MC", "SHORT", "WRITTEN", "NOTES"].includes(search.mode);
  const topic = quadraticTopics.find(t=>t.path === "/" + parts.join("/"));
  if (topic && search.view !== "legacy" && !oldPracticeLink) {
    await connection();
    await squareMappings(topic.key);
    return <Platform key={topic.key} square={squarePublicLesson(topic)} />;
  }
  if (!route) return <Platform />;
  await connection();
  const q = (await searchParams).q;
  let data: DiscoveryData;
  try { data = await publicDiscovery(); }
  catch { data = { courses: [], items: [], unavailable: true }; }
  return <Platform discovery={{ ...route, data, query: (typeof q === "string" ? q : "").slice(0, 120) }} />;
}
