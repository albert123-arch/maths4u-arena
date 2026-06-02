import type { AuthUser } from "./auth";
import { messages } from "./messages";
import { prisma } from "./prisma";
import { parseSessionSettings, sessionSettingsJson } from "./session-settings";

type ArchiveResult =
  | {
      ok: true;
      code: string;
      archived: boolean;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

async function findSessionForArchive(code: string) {
  return prisma.gameSession.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      code: true,
      settingsJson: true,
      testVersion: {
        select: {
          test: {
            select: {
              ownerUserId: true,
            },
          },
        },
      },
    },
  });
}

function canManageSession(user: AuthUser, ownerUserId: string | null) {
  return user.role === "ADMIN" || ownerUserId === user.id;
}

export async function setSessionArchived(code: string, user: AuthUser, archived: boolean): Promise<ArchiveResult> {
  const session = await findSessionForArchive(code);

  if (!session) {
    return { ok: false, error: messages.api.sessionNotFound, status: 404 };
  }

  if (!canManageSession(user, session.testVersion.test.ownerUserId)) {
    return { ok: false, error: messages.api.unauthorized, status: 401 };
  }

  const settings = parseSessionSettings(session.settingsJson);

  await prisma.gameSession.update({
    where: { code: session.code },
    data: {
      settingsJson: sessionSettingsJson({
        ...settings,
        archived,
        archivedAt: archived ? new Date().toISOString() : null,
      }),
    },
  });

  return {
    ok: true,
    code: session.code,
    archived,
  };
}
