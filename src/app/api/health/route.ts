import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      hasAppUrl: Boolean(process.env.APP_URL),
      hasAdminEmail: Boolean(process.env.ADMIN_EMAIL),
    },
  });
}
