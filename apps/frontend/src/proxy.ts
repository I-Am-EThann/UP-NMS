import { NextRequest, NextResponse } from "next/server";

// Same cookie name the backend's AuthController sets (see
// apps/backend/src/auth/constants.ts AUTH_COOKIE_NAME) — kept in sync by hand
// since the two apps don't share a module.
const AUTH_COOKIE_NAME = "up_nms_token";

const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!token && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     * - /api routes (none exist in this app anymore — auth goes straight to
     *   the backend — but excluding /api here is still correct in case any
     *   Next.js API routes get added later)
     * - Next.js internals and static assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
