// Anonymous, read-only availability; never infer translations from interface labels or OCR.
import { cache } from "react";
import { Prisma } from "../generated/prisma/client";
import { db } from "./prisma";
import { russianAvailability } from "./public-presentation";

export const publicLanguages = cache(async () => {
  const lessons = await db().$queryRaw<{ id: string; slug: string; body: string | null; examples: string | null }[]>(Prisma.sql`
    SELECT l.id,c.slug,x.body,x.examples FROM Lesson l JOIN Topic ch ON ch.id=l.topicId JOIN Course c ON c.id=ch.courseId
    LEFT JOIN LessonVersion v ON v.lessonId=l.id AND v.number=(SELECT MAX(n.number) FROM LessonVersion n WHERE n.lessonId=l.id)
    LEFT JOIN LessonText x ON x.versionId=v.id AND x.locale='ru'
    WHERE c.published=true AND c.archivedAt IS NULL AND c.featureKey IS NULL AND l.archivedAt IS NULL
    AND EXISTS(SELECT 1 FROM LessonTask a JOIN Task t ON t.id=a.taskId WHERE a.lessonId=l.id AND t.archivedAt IS NULL AND t.examArchivedAt IS NULL AND t.visibility='PUBLIC' AND t.origin <> 'UNKNOWN' AND (t.origin='ORIGINAL' OR t.originManual=true))`);
  const tasks = await db().$queryRaw<{ lessonId: string; statement: string | null; prompt: string | null }[]>(Prisma.sql`
    SELECT lt.lessonId,x.statement,pt.prompt FROM LessonTask lt JOIN Task t ON t.id=lt.taskId
    JOIN TaskVersion v ON v.taskId=t.id AND v.number=(SELECT MAX(n.number) FROM TaskVersion n WHERE n.taskId=t.id)
    LEFT JOIN TaskText x ON x.versionId=v.id AND x.locale='ru'
    LEFT JOIN TaskPart p ON p.versionId=v.id LEFT JOIN PartText pt ON pt.partId=p.id AND pt.locale='ru'
    WHERE t.visibility='PUBLIC' AND t.archivedAt IS NULL AND t.examArchivedAt IS NULL AND t.featureKey IS NULL AND t.origin <> 'UNKNOWN' AND (t.origin='ORIGINAL' OR t.originManual=true)`);
  return russianAvailability(lessons.map(l => ({ id: l.id, slug: l.slug, texts: [l.body ?? "", l.examples ?? "", ...tasks.filter(t => t.lessonId === l.id).flatMap(t => [t.statement ?? "", t.prompt ?? ""])] })));
});
