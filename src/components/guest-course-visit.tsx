"use client";
import { useEffect } from "react";
import { courseDirection, type DirectionKey } from "@/lib/discovery-model";
import { rememberGuestCourse } from "@/lib/guest-course-choice";

export function GuestCourseVisit({ enabled, level, slug, lessonHref, lessonTitle }: { enabled: boolean; level?: DirectionKey; slug?: string; lessonHref?: string; lessonTitle?: string }) {
  useEffect(() => {
    const direction = level ?? (slug && courseDirection(slug));
    if (enabled && direction) rememberGuestCourse(direction, slug, lessonHref, lessonTitle);
  }, [enabled, level, slug, lessonHref, lessonTitle]);
  return null;
}
