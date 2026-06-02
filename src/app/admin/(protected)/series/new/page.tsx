import Link from "next/link";

import { SeriesForm } from "@/components/series-form";
import { messages } from "@/lib/messages";

export default function NewSeriesPage() {
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/series" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.series.back}
        </Link>
        <h1 className="mt-3 text-3xl font-bold">{messages.series.newTitle}</h1>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <SeriesForm />
      </section>
    </div>
  );
}
