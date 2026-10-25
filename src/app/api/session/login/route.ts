import { NextResponse, type NextRequest } from "next/server";

import { backendFetch, extractTokens, extractUser, fetchSessionUser } from "@/lib/api/backend";
import { getErrorMessage } from "@/lib/api/errors";
import { setSessionCookies } from "@/lib/auth/cookies";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string; remember?: boolean }
    | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
  }

  const result = await backendFetch("auth/login", {
    method: "POST",
    json: { email: body.email.trim().toLowerCase(), password: body.password },
  });

  if (!result.ok) {
    const fallback = result.status === 401 ? "Incorrect email or password" : undefined;
    return NextResponse.json(
      { message: getErrorMessage(result.data, fallback) },
      { status: result.status },
    );
  }

  const { accessToken, refreshToken } = extractTokens(result.data);
  if (!accessToken) {
    return NextResponse.json({ message: "Unexpected response from the server" }, { status: 502 });
  }

  const user = await fetchSessionUser(accessToken, extractUser(result.data));
  const res = NextResponse.json({ accessToken, user });
  if (refreshToken) setSessionCookies(res, refreshToken, body.remember !== false);
  return res;
}
