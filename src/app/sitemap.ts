import type { MetadataRoute } from "next";
import { publicDiscovery } from "@/lib/discovery";
import { publicLanguages } from "@/lib/public-language";
import { hasRussianPage } from "@/lib/public-presentation";
import { learningDirections } from "@/lib/discovery-model";
import {furtherPublic} from '@/lib/further-public';
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = "https://arena.maths4u.sbs", data = await publicDiscovery(), languages = await publicLanguages();
  const further=await furtherPublic(),modified=new Map(further.flatMap(ch=>[[ch.chapterPath,ch.modified],...ch.lessons.map(l=>[l.path,l.modified])] as [string,string][]));
  const paths = [...new Set(["/", "/courses", "/library", "/for-teachers", ...learningDirections.map(d => "/learn/" + d.key), ...data.items.map(i => i.href),...further.map(ch=>ch.chapterPath)])];
  return paths.flatMap(path => hasRussianPage(path, languages) ? [path, "/ru" + path].map(p => ({ url: origin + p,...(modified.has(path)?{lastModified:modified.get(path)}:{}), alternates: { languages: { en: origin + path, ru: origin + "/ru" + path } } })) : [{ url: origin + path,...(modified.has(path)?{lastModified:modified.get(path)}:{}) }]);
}
