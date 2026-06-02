import { NextResponse } from "next/server";

import {
  noStoreHeaders,
  requireAdminForDiagnostics,
} from "@/lib/admin-diagnostics";
import { getSafeDatabaseUrlInfo } from "@/lib/runtime-diagnostics";

export const dynamic = "force-dynamic";

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  const unauthorized = await requireAdminForDiagnostics();

  if (unauthorized) {
    return unauthorized;
  }

  const databaseInfo = getSafeDatabaseUrlInfo();

  return NextResponse.json(
    {
      ok: true,
      env: {
        hasDatabaseUrl: databaseInfo.hasDatabaseUrl,
        hasJwtSecret: hasValue("JWT_SECRET"),
        hasAppUrl: hasValue("APP_URL"),
        hasAdminEmail: hasValue("ADMIN_EMAIL"),
        databaseHost: databaseInfo.databaseHost,
        databaseName: databaseInfo.databaseName,
      },
    },
    { headers: noStoreHeaders },
  );
}
