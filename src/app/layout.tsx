import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
export const metadata: Metadata = { title: "Maths4U — Learn, practise, progress", description: "Mathematics courses, practice, class assignments and progress in one place.", icons: { icon: "/favicon.svg" } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
