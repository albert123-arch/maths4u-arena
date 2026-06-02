import { NextResponse } from "next/server";

import {
  noStoreHeaders,
  requireAdminForDiagnostics,
} from "@/lib/admin-diagnostics";

export const dynamic = "force-dynamic";

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  const unauthorized = await requireAdminForDiagnostics();

  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json(
    {
      ok: true,
      runtime: "dynamic",
      env: {
        hasDatabaseUrl: hasValue("DATABASE_URL"),
        hasDbHost: hasValue("DB_HOST"),
        hasDbUser: hasValue("DB_USER"),
        hasDbPassword: hasValue("DB_PASSWORD"),
        hasDbName: hasValue("DB_NAME"),
        hasJwtSecret: hasValue("JWT_SECRET"),
        hasAppUrl: hasValue("APP_URL"),
        hasAdminEmail: hasValue("ADMIN_EMAIL"),
      },
    },
    { headers: noStoreHeaders },
  );
}
