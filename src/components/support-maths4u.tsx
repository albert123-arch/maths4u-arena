import Link from "next/link";

import { messages } from "@/lib/messages";

export const SUPPORT_MATHS4U_URL =
  "https://boosty.to/maths4u/single-payment/donation/804797/target?share=target_link";

export function SupportMaths4UCard() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">{messages.support.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {messages.support.description}
          </p>
        </div>
        <Link
          href={SUPPORT_MATHS4U_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:border-teal-300 hover:bg-teal-100 active:scale-[0.99]"
        >
          {messages.support.button}
        </Link>
      </div>
    </section>
  );
}

export function SupportMaths4UFooterLink() {
  return (
    <Link
      href={SUPPORT_MATHS4U_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-semibold text-slate-500 transition hover:text-teal-800"
    >
      {messages.support.footerLink}
    </Link>
  );
}
