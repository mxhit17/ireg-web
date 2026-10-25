import "server-only";

import type { NextResponse } from "next/server";

import { REFRESH_COOKIE, REMEMBER_COOKIE, REMEMBER_MAX_AGE_SECONDS } from "./constants";

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Stores the refresh token in an httpOnly cookie (JavaScript can never read it).
 * remember=true → persistent cookie (survives browser restarts for 30 days, sliding).
 * remember=false → session cookie (cleared when the browser is closed).
 */
export function setSessionCookies(res: NextResponse, refreshToken: string, remember: boolean) {
  const maxAge = remember ? REMEMBER_MAX_AGE_SECONDS : undefined;
  res.cookies.set(REFRESH_COOKIE, refreshToken, { ...base, maxAge });
  res.cookies.set(REMEMBER_COOKIE, remember ? "1" : "0", { ...base, maxAge });
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(REFRESH_COOKIE, "", { ...base, maxAge: 0 });
  res.cookies.set(REMEMBER_COOKIE, "", { ...base, maxAge: 0 });
}
