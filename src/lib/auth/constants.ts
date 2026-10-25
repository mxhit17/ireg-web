/** Shared between middleware (edge), route handlers (node) and client code — keep it dependency-free. */

/** httpOnly cookie holding the backend refresh token. Its presence is what "logged in" means to the middleware. */
export const REFRESH_COOKIE = "ireg_rt";
/** httpOnly cookie remembering whether the user ticked "Keep me signed in". */
export const REMEMBER_COOKIE = "ireg_remember";

/** How long a "Keep me signed in" session survives without activity. */
export const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Pages only for signed-out visitors. Signed-in users are bounced to HOME_ROUTE. */
export const AUTH_ROUTES = ["/login", "/signup", "/verify-otp"];

/**
 * Pages anyone can open, signed in or not. Everything else requires a session.
 * Add public pages here as they are built (e.g. "/blogs", "/knowledge-base").
 */
export const PUBLIC_ROUTES: string[] = [];

export const HOME_ROUTE = "/";
export const LOGIN_ROUTE = "/login";

export function matchesRoute(pathname: string, routes: string[]) {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Only allow same-site relative redirects (prevents open-redirects via ?next=). */
export function safeNextPath(next: string | null | undefined, fallback = HOME_ROUTE) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (matchesRoute(next, AUTH_ROUTES)) return fallback;
  return next;
}
