import type { SessionResponse, User } from "@/types/auth";
import { tokenStore, sessionEvents } from "@/lib/auth/token-store";

import { ApiError, getErrorMessage } from "./errors";

/** Browser → Next.js rewrite → NestJS. See next.config.ts. */
const BACKEND_PREFIX = "/backend";

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** POST JSON to one of our own `/api/session/*` route handlers. */
export async function postLocal<T>(url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Can't connect. Check your internet connection and try again.", 0);
  }
  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(getErrorMessage(data), res.status, data);
  return data as T;
}

// ---------------------------------------------------------------------------
// Session refresh (single-flight: concurrent 401s share one refresh request,
// which matters when the backend rotates refresh tokens).
// ---------------------------------------------------------------------------

export type RefreshResult =
  | { status: "authenticated"; accessToken: string; user: User | null }
  | { status: "unauthenticated" };

let refreshInFlight: Promise<RefreshResult> | null = null;

export function refreshSession(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<RefreshResult> => {
      try {
        const data = await postLocal<SessionResponse>("/api/session/refresh");
        tokenStore.set(data.accessToken);
        return { status: "authenticated", accessToken: data.accessToken, user: data.user };
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          tokenStore.clear();
          return { status: "unauthenticated" };
        }
        throw err; // network / 5xx — let callers decide (don't log the user out)
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// ---------------------------------------------------------------------------
// Backend API client
// ---------------------------------------------------------------------------

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Query;
  /** Attach the bearer token (default true). */
  auth?: boolean;
}

function buildUrl(path: string, query?: Query) {
  const url = `${BACKEND_PREFIX}/${path.replace(/^\/+/, "")}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { body, query, auth = true, headers, ...init } = options;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");
  if (body !== undefined && !isForm) finalHeaders.set("Content-Type", "application/json");

  if (auth) {
    // First call after a page load: restore the access token from the refresh cookie.
    if (!tokenStore.get() && !isRetry) {
      try {
        await refreshSession();
      } catch {
        /* fall through: request goes out unauthenticated */
      }
    }
    const token = tokenStore.get();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      ...init,
      headers: finalHeaders,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't connect. Check your internet connection and try again.", 0);
  }

  if (res.status === 401 && auth && !isRetry) {
    const refreshed = await refreshSession().catch(() => null);
    if (refreshed?.status === "authenticated") {
      return request<T>(path, options, true);
    }
    if (refreshed?.status === "unauthenticated") sessionEvents.emitExpired();
  }

  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(getErrorMessage(data), res.status, data);
  return data as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
