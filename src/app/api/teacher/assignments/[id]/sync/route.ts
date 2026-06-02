import { errorResponse, fail, ok } from "@/lib/api-response";
import { syncAssignmentRoster } from "@/lib/assignments";
import { requireTeacherApi } from "@/lib/auth";
import { messages } from "@/lib/messages";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const teacher = await requireTeacherApi();

  if (!teacher) {
    return fail(messages.api.unauthorized, 401);
  }

  try {
    const { id } = await params;
    const roster = await syncAssignmentRoster(id, teacher.id);

    return ok(roster);
  } catch (error) {
    return errorResponse(error);
  }
}
