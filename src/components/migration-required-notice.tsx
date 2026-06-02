import Link from "next/link";

import { messages } from "@/lib/messages";

export function MigrationRequiredNotice() {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
      <h2 className="text-lg font-semibold">{messages.setup.migrationRequiredTitle}</h2>
      <p className="mt-2 text-sm leading-6">{messages.api.migrationRequired}</p>
      <Link
        href="/admin/setup-check"
        className="mt-4 inline-flex rounded-md bg-amber-900 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800"
      >
        {messages.setup.openSetupCheck}
      </Link>
    </section>
  );
}
