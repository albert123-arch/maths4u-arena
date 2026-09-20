export type PresentationLink = {
  kind: "slides" | "drive";
  sourceKey: string;
  url: string;
  embedUrl: string;
  openUrl: string;
};

// Rebuild URLs from validated components. Never accept pasted iframe HTML,
// arbitrary hosts or redirect parameters, and never fetch a URL on the server.
export function presentationLink(input: string): PresentationLink | null {
  if (input.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(input.trim())) return null;
  let parsed: URL;
  try { parsed = new URL(input.trim()); } catch { return null; }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) return null;
  const key = parsed.searchParams.get("resourcekey");
  if (key !== null && !/^[a-zA-Z0-9_-]{1,200}$/.test(key)) return null;
  const resource = key ? "?resourcekey=" + key : "";
  if (parsed.hostname === "docs.google.com") {
    const match = /^\/presentation\/(?:u\/\d+\/)?d\/(e\/)?([a-zA-Z0-9_-]{1,200})(?:\/(edit|view|preview|present|embed|pub|pubembed))?\/?$/.exec(parsed.pathname);
    if (!match) return null;
    const published = !!match[1], id = match[2];
    if (published && ![undefined, "pub", "pubembed", "embed"].includes(match[3])) return null;
    const base = "https://docs.google.com/presentation/d/" + (published ? "e/" : "") + id;
    const embed = new URL(base + "/embed" + resource);
    embed.searchParams.set("start", "false");
    embed.searchParams.set("loop", "false");
    embed.searchParams.set("delayms", "3000");
    return { kind: "slides", sourceKey: (published ? "published:" : "file:") + id,
      url: base + (published ? "/pub" : "/edit") + resource,
      embedUrl: embed.href, openUrl: base + (published ? "/pub" : "/present") + resource };
  }
  if (parsed.hostname === "drive.google.com") {
    const match = /^\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{1,200})(?:\/(view|preview|edit))?\/?$/.exec(parsed.pathname);
    const id = match?.[1] ?? (/^\/open\/?$/.test(parsed.pathname) ? parsed.searchParams.get("id") : null);
    if (!id || !/^[a-zA-Z0-9_-]{1,200}$/.test(id)) return null;
    const base = "https://drive.google.com/file/d/" + id;
    return { kind: "drive", sourceKey: "file:" + id, url: base + "/view" + resource,
      embedUrl: base + "/preview" + resource, openUrl: base + "/view" + resource };
  }
  return null;
}
