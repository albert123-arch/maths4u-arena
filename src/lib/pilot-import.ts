import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { privateStorageRoot } from "./storage-config";
import { createTaskVersion, taskSchema } from "./content";
import { admin, digest, lockUser, secret, transaction, type Actor } from "./security";
import { pilotId, type PilotBundle } from "./pilot-schema";
import { ensure } from "./errors";

export async function writePilot(actor: Actor, bundle: PilotBundle, fileData: Map<string, Buffer>, publicationKey?: string) {
  admin(actor);
  const storage = privateStorageRoot();
  await mkdir(storage, {recursive:true});
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    ensure(bundle.format === "maths4u-pilot-v2" || !await tx.auditEvent.count({ where: { action: "PILOT_CORRECTED" } }), 409, "PILOT_LEGACY_PACKAGE_REQUIRES_CORRECTION");
    const receipt = publicationKey ? await tx.auditEvent.findFirst({ where: { action: "PILOT_PUBLISHED", targetId: publicationKey } }) : null;
    if (publicationKey && !receipt) {
      const ids = bundle.sections.flatMap(s => s.records.map(r => ({ sourceProject: s.project, legacyId: r.id })));
      ensure(!await tx.importRecord.count({ where: { OR: ids } }), 409, "PILOT_EXISTING_CONTENT_CONFLICT");
      for (const s of bundle.sections) ensure(!await tx.course.count({ where: { OR: [
        { id: pilotId("course", s.project, s.course.key) }, { slug: `${s.project}-${s.course.key}` },
      ] } }), 409, "PILOT_EXISTING_COURSE_CONFLICT");
    }
    const stats = { created: 0, updated: 0, skipped: 0, filesCreated: 0, lessonVersionsCreated: 0, sections: [] as { project: string; courseId: string; topicId: string; lessonId: string; taskIds: string[] }[] };
    const usage = await tx.storedFile.aggregate({ where: { ownerId: actor.id }, _sum: { size: true } });
    const missing = [];
    for (const asset of bundle.assets) {
      const existing = await tx.storedFile.findUnique({ where: { id: "pilot_" + asset.key } });
      if (existing) {
        if (existing.ownerId !== actor.id || existing.sha256 !== asset.sha256 || existing.size !== asset.size || existing.mimeType !== asset.mimeType
          || digest(await readFile(path.join(storage, existing.storageKey))) !== asset.sha256) throw new Error("PILOT_EXISTING_FILE_MISMATCH");
      } else missing.push(asset);
    }
    if ((usage._sum.size || 0) + missing.reduce((n, a) => n + a.size, 0) > 250 * 1024 * 1024) throw new Error("PILOT_STORAGE_QUOTA");
    for (const asset of missing) {
      const storageKey = secret();
      await writeFile(path.join(storage, storageKey), fileData.get(asset.key) ?? (() => { throw new Error("PILOT_FILES_REQUIRED"); })(), { flag: "wx" });
      // An interrupted transaction may leave an unreferenced private file; never delete a prior import's file.
      await tx.storedFile.create({ data: { id: "pilot_" + asset.key, ownerId: actor.id, storageKey, originalName: path.basename(asset.file),
        mimeType: asset.mimeType, size: asset.size, sha256: asset.sha256 } }); stats.filesCreated++;
    }
    for (const section of bundle.sections) {
      const courseId = pilotId("course", section.project, section.course.key), topicId = pilotId("topic", section.project, section.topic.key), lessonId = pilotId("lesson", section.project, section.lesson.key);
      await tx.course.upsert({ where: { id: courseId }, create: { id: courseId, slug: `${section.project}-${section.course.key}`, published: !!publicationKey }, update: publicationKey ? { published: true } : {} });
      for (const { locale, title, description } of section.course.texts) await tx.courseText.upsert({ where: { courseId_locale: { courseId, locale } }, create: { courseId, locale, title, description }, update: { title, description } });
      await tx.topic.upsert({ where: { id: topicId }, create: { id: topicId, courseId, slug: section.topic.key, position: section.topic.position }, update: { position: section.topic.position } });
      for (const { locale, title } of section.topic.texts) await tx.topicText.upsert({ where: { topicId_locale: { topicId, locale } }, create: { topicId, locale, title }, update: { title } });
      await tx.lesson.upsert({ where: { id: lessonId }, create: { id: lessonId, topicId }, update: {} });
      const previous = await tx.lessonVersion.findFirst({ where: { lessonId }, orderBy: { number: "desc" }, include: { texts: true } });
      const lessonTexts = section.lesson.texts.map(({ locale, title, body, examples }) => ({ locale, title, body, examples: examples ?? "" })).sort((a, b) => a.locale.localeCompare(b.locale));
      const oldTexts = previous?.texts.map(({ locale, title, body, examples }) => ({ locale, title, body, examples: examples ?? "" })).sort((a, b) => a.locale.localeCompare(b.locale));
      if (JSON.stringify(oldTexts) !== JSON.stringify(lessonTexts)) { await tx.lessonVersion.create({ data: { lessonId, number: (previous?.number || 0) + 1, texts: { create: lessonTexts } } }); stats.lessonVersionsCreated++; }
      const taskIds = [];
      for (const row of section.records) {
        const material = taskSchema.parse({ ...row.material, visibility: publicationKey ? "PUBLIC" : row.material.visibility, topicIds: [topicId] }), contentHash = digest(JSON.stringify(material));
        const key = { sourceProject: section.project, legacyId: row.id };
        const existing = await tx.importRecord.findUnique({ where: { sourceProject_legacyId: key } });
        let taskId = existing?.taskId;
        if (existing?.contentHash === contentHash) stats.skipped++;
        else {
          const version = await createTaskVersion(tx, actor, material, taskId); taskId = version.taskId;
          await tx.importRecord.upsert({ where: { sourceProject_legacyId: key }, create: { ...key, taskId, contentHash }, update: { contentHash, importedAt: new Date() } });
          if (existing) stats.updated++; else stats.created++;
        }
        await tx.lessonTask.upsert({ where: { lessonId_taskId: { lessonId, taskId: taskId! } }, create: { lessonId, taskId: taskId!, position: row.position }, update: { position: row.position } });
        taskIds.push(taskId!);
      }
      stats.sections.push({ project: section.project, courseId, topicId, lessonId, taskIds });
    }
    await tx.auditEvent.create({ data: { actorId: actor.id, action: publicationKey ? "PILOT_PUBLISHED" : "PILOT_IMPORTED", targetId: publicationKey || bundle.selection } });
    return stats;
  });
}
