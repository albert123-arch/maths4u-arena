import { courseDirection, courseLevels, type DirectionKey } from "./discovery-model";

const storageKey = "maths4u.guest-course.v1";
const eventName = "maths4u:guest-course";
type GuestChoice = { direction: DirectionKey; courseSlug?: string; lessonHref?: string; lessonTitle?: string };

export function guestCourseSnapshot(): string | null {
  try { return window.localStorage.getItem(storageKey); } catch { return null; }
}
export function parseGuestCourseChoice(raw: string | null): GuestChoice | null {
  if (!raw) return null;
  try {
    const row = JSON.parse(raw);
    if (!courseLevels.some(level => level.key === row?.direction)) return null;
    const choice: GuestChoice = { direction: row.direction };
    if (typeof row.courseSlug === "string" && /^[a-z0-9_-]+$/i.test(row.courseSlug) && courseDirection(row.courseSlug) === choice.direction) {
      choice.courseSlug = row.courseSlug;
      if (typeof row.lessonHref === "string" && /^\/(?:ru\/)?courses\/[a-z0-9_-]+\/topics\/[a-z0-9_-]+$/i.test(row.lessonHref)
        && row.lessonHref.includes("/courses/" + row.courseSlug + "/topics/")) choice.lessonHref = row.lessonHref;
    }
    if (choice.lessonHref && typeof row.lessonTitle === "string") choice.lessonTitle = row.lessonTitle.slice(0, 240);
    return choice;
  } catch { return null; }
}
export function readGuestCourseChoice() { return parseGuestCourseChoice(guestCourseSnapshot()); }
export function rememberGuestCourse(direction: DirectionKey, courseSlug?: string, lessonHref?: string, lessonTitle?: string) {
  if (!courseLevels.some(level => level.key === direction)) return;
  const previous = readGuestCourseChoice();
  const choice = previous?.direction === direction ? previous : { direction };
  if (courseSlug && courseDirection(courseSlug) === direction && /^[a-z0-9_-]+$/i.test(courseSlug)) {
    if (choice.courseSlug !== courseSlug) { delete choice.lessonHref; delete choice.lessonTitle; }
    choice.courseSlug = courseSlug;
    if (lessonHref) { choice.lessonHref = lessonHref; choice.lessonTitle = lessonTitle?.slice(0, 240); }
  }
  try {
    const value = JSON.stringify(choice);
    if (window.localStorage.getItem(storageKey) !== value) {
      window.localStorage.setItem(storageKey, value);
      window.dispatchEvent(new Event(eventName));
    }
  } catch { /* Lessons also work when browser storage is disabled. */ }
}
export function subscribeGuestCourse(changed: () => void) {
  const onStorage = (event: StorageEvent) => { if (!event.key || event.key === storageKey) changed(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(eventName, changed);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(eventName, changed);
  };
}
