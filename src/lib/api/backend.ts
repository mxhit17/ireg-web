import "server-only";

import type { User } from "@/types/auth";

import { extractUser, isObj } from "./normalize";

export { extractUser };

/**
 * Server-side helpers used by the `/api/session/*` route handlers to talk to the
 * NestJS backend directly (the browser goes through the `/backend/*` rewrite instead).
 */

export const API_URL = (
  process.env.IREG_API_URL ?? "https://ireg-v2-backend-production.up.railway.app/api"
).replace(/\/+$/, "");

export interface BackendResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
}

export async function backendFetch<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown; token?: string } = {},
): Promise<BackendResult<T>> {
  const { json, token, headers, ...rest } = init;
  const url = `${API_URL}/${path.replace(/^\/+/, "")}`;

  try {
    const res = await fetch(url, {
      ...rest,
      headers: {
        Accept: "application/json",
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, data: data as T };
  } catch (err) {
    console.error(`[backend] ${init.method ?? "GET"} ${url} failed`, err);
    return { ok: false, status: 503, data: { message: "Can't reach the IREG server right now. Please try again." } as T };
  }
}


/** Finds access/refresh tokens wherever the backend put them (top level, `data`, or `tokens`). */
export function extractTokens(body: unknown): { accessToken?: string; refreshToken?: string } {
  const candidates = [body, isObj(body) ? body.data : null, isObj(body) ? body.tokens : null];
  if (isObj(body) && isObj(body.data)) candidates.push(body.data.tokens);

  for (const c of candidates) {
    if (!isObj(c)) continue;
    const accessToken = (c.accessToken ?? c.access_token) as string | undefined;
    if (typeof accessToken === "string" && accessToken) {
      const refreshToken = (c.refreshToken ?? c.refresh_token) as string | undefined;
      return { accessToken, refreshToken: typeof refreshToken === "string" ? refreshToken : undefined };
    }
  }
  return {};
}

/**
 * Builds the session user. `auth/me` only returns `{ id, email, roles }`, so we merge it with
 * `user-and-admin-management/profile` (name, photo, created_at…). `base` is the user from the
 * login / verify-otp response, used if either call fails.
 */
export async function fetchSessionUser(accessToken: string, base?: User | null): Promise<User | null> {
  const [me, profile] = await Promise.all([
    backendFetch("auth/me", { token: accessToken }),
    backendFetch("user-and-admin-management/profile", { token: accessToken }),
  ]);
  const meUser = me.ok ? extractUser(me.data) : null;
  const profileUser = profile.ok ? extractUser(profile.data) : null;

  if (!meUser && !profileUser && !base) return null;
  return {
    ...base,
    ...meUser,
    ...profileUser,
    roles: meUser?.roles ?? base?.roles ?? [],
  } as User;
}
