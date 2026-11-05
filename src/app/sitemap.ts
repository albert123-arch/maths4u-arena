import type { MetadataRoute } from "next";
import { publicDiscovery } from "@/lib/discovery";
import { publicLanguages } from "@/lib/public-language";
import { hasRussianPage } from "@/lib/public-presentation";
import { learningDirections } from "@/lib/discovery-model";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = "https://arena.maths4u.sbs", data = await publicDiscovery(), languages = await publicLanguages();
  const paths = [...new Set(["/", "/courses", "/library", "/for-teachers", ...learningDirections.map(d => "/learn/" + d.key), ...data.items.map(i => i.href)])];
  return paths.flatMap(path => hasRussianPage(path, languages) ? [path, "/ru" + path].map(p => ({ url: origin + p, alternates: { languages: { en: origin + path, ru: origin + "/ru" + path } } })) : [{ url: origin + path }]);
}
