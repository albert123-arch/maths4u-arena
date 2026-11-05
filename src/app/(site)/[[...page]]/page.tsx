import { pageMetadata, renderPage, type PageProps } from "@/lib/public-pages";
export const generateMetadata = (props: PageProps) => pageMetadata(props, "en");
export default function Page(props: PageProps) { return renderPage(props, "en"); }
