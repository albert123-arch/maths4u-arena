import { materialGrant, type readMaterialGrant } from "./material-grant";
import type { Version } from "./content";
import type { Actor } from "./security";
import type { TeacherPreviewAsset } from "./teacher-task-preview-model";

type Grant = NonNullable<ReturnType<typeof readMaterialGrant>>;
type PreviewActor = Pick<Actor, "id" | "roles">;

export function teacherPreviewGrantMatches(grant: Grant, actor: PreviewActor | null, lens: unknown, latestVersionId: string) {
  return grant.context === "teacher-preview" && !!actor && !lens &&
    actor.roles.some(role => role.role === "TEACHER" || role.role === "ADMIN") &&
    grant.actorId === actor.id && grant.versionId === latestVersionId;
}

// Reuse signed, version/role/actor-bound StoredFile grants. The extra context
// prevents teacher-only help URLs being replayed through a learner view lens.
export function teacherPreviewAssets(version: Version, locale: string, roles: string[], actor: Pick<Actor, "id">) {
  const eligible = version.assets.filter(asset => roles.includes(asset.role) && (!asset.locale || asset.locale === locale));
  const grants = new Map(eligible.map(asset => [asset.fileId, materialGrant({ fileId: asset.fileId, versionId: version.id, role: asset.role, actorId: actor.id, context: "teacher-preview" })]));
  function rewrite(html: string) {
    return html.replace(/\b(src|href)=(['"])(\/api\/files\/([\w-]+)(?:\?[^'"]*)?)\2/g, (all, attribute, quote, url, id) => {
      const token = grants.get(id);
      if (!token) return all;
      const target = new URL(url.replaceAll("&amp;", "&"), "http://material.local");
      target.searchParams.set("support", token);
      return attribute + "=" + quote + (target.pathname + target.search).replaceAll("&", "&amp;") + quote;
    });
  }
  function list(visibleHtml = ""): TeacherPreviewAsset[] {
    return [...new Map(eligible.map(asset => [asset.fileId, {
      id: asset.fileId, caption: asset.caption, role: asset.role, mimeType: asset.file.mimeType,
      partPosition: asset.partPosition, accessToken: grants.get(asset.fileId),
      embedded: visibleHtml.includes("/api/files/" + asset.fileId + "?"),
    }])).values()];
  }
  return { rewrite, list, grants };
}
