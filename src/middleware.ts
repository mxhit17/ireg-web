import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_ROUTES,
  HOME_ROUTE,
  LOGIN_ROUTE,
  PUBLIC_ROUTES,
  REFRESH_COOKIE,
  matchesRoute,
  safeNextPath,
} from "@/lib/auth/constants";

/**
 * Fast, cookie-presence route guard (no network calls):
 *  - signed-out visitors hitting a protected page → /login?next=<page>
 *  - signed-in users hitting /login, /signup, /verify-otp → home (or ?next=)
 * The real validity check happens client-side via /api/session/refresh; if the cookie
 * turns out to be stale, that route clears it, so there's no redirect loop.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has(REFRESH_COOKIE);

  if (matchesRoute(pathname, AUTH_ROUTES)) {
    if (hasSession) {
      const next = safeNextPath(req.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(next, req.url));
    }
    return NextResponse.next();
  }

  if (matchesRoute(pathname, PUBLIC_ROUTES)) return NextResponse.next();

  if (!hasSession) {
    const url = new URL(LOGIN_ROUTE, req.url);
    if (pathname !== HOME_ROUTE) url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, our API/proxy routes and static files.
  matcher: ["/((?!api|backend|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
