import { SiteDocument } from "@/components/site-document";
export { siteMetadata as metadata } from "@/components/site-document";
export default function Layout({ children }: { children: React.ReactNode }) { return <SiteDocument locale="ru">{children}</SiteDocument>; }
