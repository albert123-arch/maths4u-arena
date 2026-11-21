import reviewed from "../../content/original/9709-s1/solution-image-display.json";

type Replacement = { questionUids: string[]; html: string };
const replacements = reviewed as Record<string, Replacement>;

export function projectSolutionImages(
  html: string,
  questionUid: string | null,
  allowedFiles?: ReadonlySet<string>,
) {
  const replaced = new Set<string>();
  if (questionUid && html.includes("/api/files/")) {
    // Authored solution figures are standalone paragraphs in these packages.
    // Replace the wrapper too, so a real table can occupy the same position.
    html = html.replace(/<p>\s*<img\b[^>]*?\bsrc=(["'])\/api\/files\/([\w-]+)\1[^>]*>\s*<\/p>/g,
      (original, _quote, fileId: string) => {
        const replacement = Object.hasOwn(replacements, fileId) ? replacements[fileId] : undefined;
        if (!replacement?.questionUids.includes(questionUid) || (allowedFiles && !allowedFiles.has(fileId))) return original;
        replaced.add(fileId);
        return replacement.html;
      });
  }
  return { html, replaced };
}

export function projectAttachedSolutionImages(
  html: string,
  version: { sourceUid: string | null; assets: readonly { fileId: string; role: string; locale: string | null }[] },
  locale: string,
) {
  const allowedFiles = new Set(version.assets
    .filter(asset => asset.role === "SOLUTION" && (!asset.locale || asset.locale === locale))
    .map(asset => asset.fileId));
  return projectSolutionImages(html, version.sourceUid, allowedFiles);
}
