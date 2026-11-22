import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./prisma";
import { COOKIE, isAdmin, isTeacher } from "./security";
import { resolveRequestView } from "./view-lens";

async function currentHomeActor() {
  const session = (await cookies()).get(COOKIE)?.value;
  return session ? (await resolveRequestView(session)).actor : null;
}

export async function redirectSignedInFromHome() {
  const actor = await currentHomeActor();
  if (actor) redirect(isAdmin(actor) ? "/admin" : isTeacher(actor) ? "/teacher" : "/student");
}

export async function studentSearchCourses(publicSlugs: string[]): Promise<string[] | undefined> {
  const actor = await currentHomeActor();
  if (!actor || isTeacher(actor)) return undefined;
  const follows = await db().courseFollow.findMany({
    where: { userId: actor.id, course: { slug: { in: publicSlugs } } },
    select: { course: { select: { slug: true } } },
  });
  return follows.map(follow => follow.course.slug);
}
