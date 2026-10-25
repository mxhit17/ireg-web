import { NextResponse, type NextRequest } from "next/server";

import { backendFetch, extractTokens, extractUser, fetchSessionUser } from "@/lib/api/backend";
import { getErrorMessage } from "@/lib/api/errors";
import { setSessionCookies } from "@/lib/auth/cookies";

/**
 * Verifies the signup OTP. If the backend signs the user in on verification (returns tokens),
 * the session is started right away; otherwise the client sends the user to the login page.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string; otp?: string } | null;

  if (!body?.email || !body?.otp) {
    return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 });
  }

  const result = await backendFetch("auth/verify-otp", {
    method: "POST",
    json: { email: body.email.trim().toLowerCase(), otp: body.otp.trim() },
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: getErrorMessage(result.data, "That code is invalid or has expired") },
      { status: result.status },
    );
  }

  const { accessToken, refreshToken } = extractTokens(result.data);
  const message = getErrorMessage(result.data, "Email verified");

  if (!accessToken) {
    return NextResponse.json({ verified: true, message });
  }

  const user = await fetchSessionUser(accessToken, extractUser(result.data));
  const res = NextResponse.json({ verified: true, message, accessToken, user });
  if (refreshToken) setSessionCookies(res, refreshToken, true);
  return res;
}
