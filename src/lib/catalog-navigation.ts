import type { PracticeMode } from "./catalog";

export const catalogFilterKeys = ["q", "course", "chapter", "topic", "category", "year", "session",
  "paper", "language", "difficulty", "page", "pageSize", "mode", "progress", "bookmarks", "source", "taskId", "legacyLesson"];

type RouteLocation = Pick<Location, "pathname" | "search" | "hash">;

function href({ pathname, hash }: RouteLocation, params: URLSearchParams) {
  const search = params.toString();
  return pathname + (search ? "?" + search : "") + hash;
}

export function catalogFilterHref(location: RouteLocation, filters: Record<string, string>) {
  const params = new URLSearchParams(location.search);
  for (const key of catalogFilterKeys) {
    if (filters[key]) params.set(key, filters[key]);
    else params.delete(key);
  }
  return href(location, params);
}

export function topicMode(value: string | null | undefined): PracticeMode | "NOTES" {
  return value === "MC" || value === "SHORT" || value === "WRITTEN" ? value : "NOTES";
}

export function topicModeHref(location: RouteLocation, mode: PracticeMode | "NOTES") {
  const params = new URLSearchParams(location.search);
  params.delete("page");
  params.delete("reviewTask");
  if (mode === "NOTES") params.delete("mode");
  else params.set("mode", mode);
  return href(location, params);
}
