import { NextResponse, type NextRequest } from "next/server";

import { backendFetch, extractTokens, fetchSessionUser } from "@/lib/api/backend";
import { getErrorMessage } from "@/lib/api/errors";
import { clearSessionCookies, setSessionCookies } from "@/lib/auth/cookies";
import { REFRESH_COOKIE, REMEMBER_COOKIE } from "@/lib/auth/constants";

/**
 * Exchanges the httpOnly refresh-token cookie for a fresh access token (+ the current user).
 * Called on every page load to restore the session, and whenever an API call gets a 401.
 *
 * 401 → session is gone (cookies cleared). 5xx/503 → server trouble; cookies are kept so a
 * flaky backend doesn't log anyone out.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: "Not signed in" }, { status: 401 });
  }

  const result = await backendFetch("auth/refresh", { method: "POST", json: { refreshToken } });

  if (!result.ok) {
    const expired = result.status >= 400 && result.status < 500;
    const res = NextResponse.json(
      { message: getErrorMessage(result.data, expired ? "Your session has expired" : undefined) },
      { status: expired ? 401 : result.status },
    );
    if (expired) clearSessionCookies(res);
    return res;
  }

  const tokens = extractTokens(result.data);
  if (!tokens.accessToken) {
    const res = NextResponse.json({ message: "Your session has expired" }, { status: 401 });
    clearSessionCookies(res);
    return res;
  }

  // auth/refresh only returns a new access token (no rotation) — build the user from me + profile.
  const user = await fetchSessionUser(tokens.accessToken);
  if (!user) {
    const res = NextResponse.json({ message: "Your session has expired" }, { status: 401 });
    clearSessionCookies(res);
    return res;
  }

  const remember = req.cookies.get(REMEMBER_COOKIE)?.value !== "0";
  const res = NextResponse.json({ accessToken: tokens.accessToken, user });
  // Re-set the cookie: stores the rotated token if the backend issued one, and slides the 30-day window.
  setSessionCookies(res, tokens.refreshToken ?? refreshToken, remember);
  return res;
}
