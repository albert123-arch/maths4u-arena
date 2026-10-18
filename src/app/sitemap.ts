import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/courses", "/library"].map(path => ({ url: `https://arena.maths4u.sbs${path}` }));
}
