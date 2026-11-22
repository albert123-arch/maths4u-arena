import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/teacher", "/student", "/attempts", "/works", "/access", "/join-class", "/login", "/register", "/recover", "/bookmarks", "/olympiads", "/exam-archive", "/ru/exam-archive"] },
    sitemap: "https://arena.maths4u.sbs/sitemap.xml",
  };
}
