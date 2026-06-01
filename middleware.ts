import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "maths4u_admin_session";

function isPublicOrStaticPath(pathname: string) {
  return (
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/") ||
    pathname === "/api/admin/login" ||
    pathname === "/api/health" ||
    pathname === "/api/db-check" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicOrStaticPath(pathname)) {
    return NextResponse.next();
  }

  const hasAdminSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname.startsWith("/admin") && !hasAdminSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/api/admin") && !hasAdminSession) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
