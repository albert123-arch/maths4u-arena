import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { StudentLogoutButton } from "@/components/student-logout-button";
import { SupportMaths4UCard, SupportMaths4UFooterLink } from "@/components/support-maths4u";
import { getCurrentUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { getCurrentStudent } from "@/lib/student-auth";

const workflowSteps = [
  messages.home.workflowSteps.classes,
  messages.home.workflowSteps.invite,
  messages.home.workflowSteps.sets,
  messages.home.workflowSteps.launch,
];

export default async function Home() {
  const [user, student] = await Promise.all([getCurrentUser(), getCurrentStudent()]);
  const signedIn = user
    ? {
        title:
          user.role === "ADMIN"
            ? messages.home.continueToAdmin
            : messages.home.continueToTeacher,
        href: user.role === "ADMIN" ? "/admin" : "/teacher",
        name: user.name ?? user.email,
        logout: <LogoutButton />,
      }
    : student
      ? {
          title: messages.home.continueToStudent,
          href: "/student",
          name: student.displayName,
          logout: <StudentLogoutButton />,
        }
      : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto grid min-h-screen max-w-6xl content-center gap-8 px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="grid gap-6">
            <p className="w-fit rounded-md bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-900">
              {messages.home.eyebrow}
            </p>
            <div className="grid gap-4">
              <h1 className="text-4xl font-bold leading-tight sm:text-6xl">{messages.common.appName}</h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">{messages.home.description}</p>
            </div>
            {signedIn ? (
              <section className="grid gap-4 rounded-md border border-teal-200 bg-white p-5 shadow-sm lg:max-w-xl">
                <div>
                  <p className="text-sm font-semibold text-teal-800">{messages.home.signedInTitle}</p>
                  <h2 className="mt-1 text-2xl font-bold">{signedIn.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">{messages.home.signedInDescription}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={signedIn.href}
                    className="rounded-md bg-teal-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-teal-800 active:scale-[0.99]"
                  >
                    {signedIn.title}
                  </Link>
                  {signedIn.logout}
                </div>
              </section>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
                <Link
                  href="/login"
                  className="rounded-md bg-teal-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-teal-800 active:scale-[0.99]"
                >
                  {messages.home.loginCta}
                </Link>
                <Link
                  href="/play"
                  className="rounded-md border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-800 transition hover:border-teal-300 hover:bg-teal-50"
                >
                  {messages.home.playCta}
                </Link>
                <Link
                  href="/join-class"
                  className="rounded-md border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-800 transition hover:border-teal-300 hover:bg-teal-50"
                >
                  {messages.home.joinClassCta}
                </Link>
                <Link
                  href="/student/register"
                  className="rounded-md border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-800 transition hover:border-teal-300 hover:bg-teal-50"
                >
                  {messages.home.createStudentCta}
                </Link>
              </div>
            )}
          </div>

          <div className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold">{messages.home.teacherTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{messages.home.teacherDescription}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {workflowSteps.map((step, index) => (
                <div key={step} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-teal-800">Step {index + 1}</p>
                  <p className="mt-1 font-semibold">{step}</p>
                </div>
              ))}
            </div>
            <Link
              href="/login?next=/teacher"
              className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {messages.home.loginCta}
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <InfoCard title={messages.home.studentTitle} description={messages.home.studentDescription} />
          <InfoCard title={messages.home.teacherTitle} description="Teacher accounts are created by an administrator." />
          <InfoCard title={messages.home.adminTitle} description={messages.home.adminDescription} />
        </section>

        <SupportMaths4UCard />

        <footer className="flex justify-center">
          <SupportMaths4UFooterLink />
        </footer>
      </section>
    </main>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
