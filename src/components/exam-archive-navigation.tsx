"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import type { examArchiveOverview, examArchivePaper, examArchiveTopic } from '@/lib/exam-archive';
import type { examArchiveGrants } from '@/lib/exam-archive-access';
import type { examArchiveQuestion, examArchiveSupport } from '@/lib/exam-archive-content';

export type Overview = Awaited<ReturnType<typeof examArchiveOverview>>;
export type Paper = Awaited<ReturnType<typeof examArchivePaper>>;
export type Topic = Awaited<ReturnType<typeof examArchiveTopic>>;
export type Question = Awaited<ReturnType<typeof examArchiveQuestion>>;
export type Support = Awaited<ReturnType<typeof examArchiveSupport>>;
export type Grants = Awaited<ReturnType<typeof examArchiveGrants>>;
export type TopicNode = Overview["topics"][number];
export type PaperRow = Overview["papers"][number];
export type Preference = Overview["preferences"];
export type Mode = Preference["mode"];
export const filterKeys = ["paper", "year", "session", "difficulty", "minMarks", "maxMarks", "type"] as const;
export type Filters = Record<(typeof filterKeys)[number], string>;
export type TopicActivity = "overview" | "practice" | "exam";
export type View = {
  mode: Mode; showOtherCourses: boolean; course: string; chapter: string; topicKey: string | null;
  syllabus: string | null; year: number | null; session: string | null; paperId: string | null;
  questionId: string; topicActivity: TopicActivity; originalPage: number; page: number; filters: Filters; manage: boolean;
};
export type Navigate = (next: Partial<View>, save?: Partial<Preference>) => void;
export type Shared = { overview: Overview; view: View; navigate: Navigate; revision: number };

export const programmes = [
  { code: "9709", title: "A Level Mathematics", cambridge: "cambridge-international-as-and-a-level-mathematics-9709" },
  { code: "9231", title: "Further Mathematics", cambridge: "cambridge-international-as-and-a-level-further-mathematics-9231" },
  { code: "0606", title: "Additional Mathematics", cambridge: "cambridge-igcse-additional-mathematics-0606" },
  { code: "0580", title: "IGCSE Mathematics", cambridge: "cambridge-igcse-mathematics-0580" },
] as const;
export const emptyFilters = { paper: "", year: "", session: "", difficulty: "", minMarks: "", maxMarks: "", type: "" };
export const sortLabel = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true });
export const countLabel = (count: number, unit: string) => count + " " + unit + (count === 1 ? "" : "s");

export function sessionLabel(value: string) {
  const lower = value.toLowerCase();
  if (/^(m|f|fm|feb|mar|march|february[ /_-]+march)$/.test(lower)) return "March";
  if (/^(s|mj|may|jun|june|may[ /_-]+june)$/.test(lower)) return "June";
  if (/^(w|on|oct|nov|november|october[ /_-]+november)$/.test(lower)) return "November";
  return value.replace(/^./, letter => letter.toUpperCase());
}

export function sessionSort(a: string, b: string) {
  const order = (value: string) => {
    const index = ["March", "June", "November"].indexOf(sessionLabel(value));
    return index < 0 ? 3 : index;
  };
  return order(a) - order(b) || sortLabel(a, b);
}

function asPage(value: string | null) {
  return /^[1-9]\d{0,5}$/.test(value ?? "") ? Number(value) : 1;
}

const filterParameter = { paper: "filterPaper", year: "filterYear", session: "filterSession",
  difficulty: "difficulty", minMarks: "minMarks", maxMarks: "maxMarks", type: "type" };

export function readLocation(preferences: Preference, query: string): View {
  const params = new URLSearchParams(query);
  const mode = params.get("mode");
  const activity = params.get("activity");
  const restore = !params.has("mode") && !params.has("access");
  const filters = { ...emptyFilters };
  for (const key of filterKeys) filters[key] = params.get(filterParameter[key]) ?? "";
  return {
    mode: mode === "past-papers" || mode === "topicwise" ? mode : preferences.mode,
    showOtherCourses: params.has("other") ? params.get("other") === "1" : preferences.showOtherCourses,
    course: params.get("course") ?? "", chapter: params.get("chapter") ?? "",
    topicKey: params.get("topic") ?? (restore ? preferences.topicKey : null),
    syllabus: params.get("syllabus") ?? (restore ? preferences.syllabus : null),
    year: /^\d{4}$/.test(params.get("year") ?? "") ? Number(params.get("year")) : restore ? preferences.year : null,
    session: params.get("session") ?? (restore ? preferences.session : null),
    paperId: params.get("paperId") ?? (restore ? preferences.paperId : null),
    questionId: params.get("question") ?? "",
    topicActivity: activity === "practice" || activity === "exam" ? activity : "overview", originalPage: asPage(params.get("originalPage")),
    page: asPage(params.get("page")), filters, manage: params.get("access") === "1",
  };
}

export function hrefFor(view: View) {
  const params = new URLSearchParams({ mode: view.mode, other: view.showOtherCourses ? "1" : "0" });
  if (view.manage) params.set("access", "1");
  if (view.mode === "topicwise") {
    if (view.course) params.set("course", view.course);
    if (view.chapter) params.set("chapter", view.chapter);
    if (view.topicKey) params.set("topic", view.topicKey);
    if (view.topicActivity !== "overview") params.set("activity", view.topicActivity);
    if (view.page > 1) params.set("page", String(view.page));
    if (view.originalPage > 1) params.set("originalPage", String(view.originalPage));
    for (const key of filterKeys) if (view.filters[key]) params.set(filterParameter[key], view.filters[key]);
  } else {
    if (view.syllabus) params.set("syllabus", view.syllabus);
    if (view.year) params.set("year", String(view.year));
    if (view.session) params.set("session", view.session);
    if (view.paperId) params.set("paperId", view.paperId);
  }
  if (view.questionId) params.set("question", view.questionId);
  return "/exam-archive?" + params;
}

class ArchiveError extends Error {
  constructor(readonly status: number) {
    super([401, 403, 404].includes(status)
      ? "This archive page is unavailable. Your access may have expired."
      : "Could not load this archive page. Please try again.");
  }
}

export async function requestArchive<T>(path = "", options: RequestInit = {}): Promise<T> {
  const response = await fetch("/api/exam-archive" + path, {
    cache: "no-store", credentials: "same-origin", ...options,
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) throw new ArchiveError(response.status);
  return response.status === 204 ? undefined as T : response.json();
}

export function useArchive<T>(path: string | null, revision = 0) {
  const [result, setResult] = useState<{ key: string; value?: T; error?: Error }>();
  const key = path === null ? null : path + "|" + revision;
  useEffect(() => {
    if (path === null || key === null) return;
    const controller = new AbortController();
    void requestArchive<T>(path, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setResult({ key, value });
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setResult({ key, error });
    });
    return () => controller.abort();
  }, [key, path]);
  return result?.key === key ? result : undefined;
}

export function Status({ error }: { error: Error }) {
  return <p role="alert" className="notice error">{error.message}</p>;
}

export function ArchiveLink({ view, next, navigate, save, children, current, className, label }: {
  view: View; next: Partial<View>; navigate: Navigate; save?: Partial<Preference>; children: ReactNode; current?: boolean; className?: string; label?: string;
}) {
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    navigate(next, save);
  }
  return <Link href={hrefFor({ ...view, ...next })} prefetch={false} onClick={open}
    aria-current={current ? "page" : undefined} aria-label={label} className={className}>{children}</Link>;
}
