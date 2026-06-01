import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function GET() {
  return NextResponse.json({
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
  });
}
