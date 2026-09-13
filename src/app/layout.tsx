import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
export const metadata: Metadata = { title: "Maths4U — учиться, решать, понимать", description: "Математика, классы, домашние работы и олимпиады в одном месте.", icons: { icon: "/favicon.svg" } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
