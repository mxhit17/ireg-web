import type { User } from "@/types/auth";

/**
 * Response-shape helpers shared by the browser client and the server route handlers.
 * The NestJS API sometimes wraps payloads in `{ data }` and field names vary between
 * modules, so these look in the usual places instead of hard-coding one shape.
 */

type AnyObj = Record<string, unknown>;
export const isObj = (v: unknown): v is AnyObj => !!v && typeof v === "object" && !Array.isArray(v);

/** `{ data: X }` → X, otherwise the body itself. */
export function unwrap<T = unknown>(body: unknown): T {
  return (isObj(body) && "data" in body ? body.data : body) as T;
}

/** Finds the user object in a response (`data.user`, `data`, `user`, or the body itself). */
export function extractUser(body: unknown): User | null {
  const candidates: unknown[] = [];
  if (isObj(body)) {
    if (isObj(body.data)) candidates.push(body.data.user, body.data);
    candidates.push(body.user, body);
  }
  for (const c of candidates) {
    if (isObj(c) && (typeof c.id === "string" || typeof c.id === "number") && ("email" in c || "name" in c)) {
      const safe: AnyObj = { ...c, id: String(c.id) };
      delete safe.password;
      delete safe.password_hash;
      const roles = extractRoles(c);
      delete safe.user_roles;
      if (roles) safe.roles = roles;
      return safe as User;
    }
  }
  return null;
}

/** `roles: ["ADMIN"]` (auth/me) or `user_roles: [{ roles: { name } }]` (login / verify-otp). */
function extractRoles(c: AnyObj): string[] | undefined {
  if (Array.isArray(c.roles)) return c.roles.filter((r): r is string => typeof r === "string");
  if (Array.isArray(c.user_roles)) {
    return c.user_roles
      .map((ur) => (isObj(ur) && isObj(ur.roles) ? ur.roles.name : null))
      .filter((r): r is string => typeof r === "string");
  }
  return undefined;
}

export function isAdmin(user: Partial<User> | null | undefined) {
  return !!user?.roles?.some((r) => r.toUpperCase() === "ADMIN");
}

/** Subject-matter expert (lawyer, CA, banker…) who answers consultations. */
export function isSme(user: Partial<User> | null | undefined) {
  return !!user?.roles?.some((r) => r.toUpperCase() === "SME");
}

/** Keys the backend might use for the profile photo, in order of preference. */
const AVATAR_KEYS = [
  "profile_image_url",
  "profileImageUrl",
  "profile_image",
  "profileImage",
  "profile_photo",
  "profilePhoto",
  "avatar_url",
  "avatarUrl",
  "avatar",
  "photo_url",
  "photoUrl",
  "image_url",
  "imageUrl",
] as const;

function asUrl(v: unknown): string | null {
  if (typeof v === "string" && /^(https?:|data:|blob:|\/)/.test(v)) return v;
  if (isObj(v)) return asUrl(v.secure_url ?? v.url ?? v.src);
  return null;
}

export function getAvatarUrl(user: Partial<User> | null | undefined): string | null {
  if (!user) return null;
  for (const key of AVATAR_KEYS) {
    const url = asUrl((user as AnyObj)[key]);
    if (url) return url;
  }
  return null;
}

/** The key this user object already stores its photo under (so local updates stay consistent). */
export function getAvatarKey(user: Partial<User> | null | undefined): string {
  if (user) for (const key of AVATAR_KEYS) if (key in user) return key;
  return "profile_image_url";
}

/** Finds an image URL in an upload response that may not contain the full user. */
export function extractImageUrl(body: unknown): string | null {
  const user = extractUser(body);
  if (user) return getAvatarUrl(user);
  for (const c of [unwrap(body), body]) {
    if (!isObj(c)) continue;
    const direct = asUrl(c.secure_url ?? c.url) ?? getAvatarUrl(c as Partial<User>);
    if (direct) return direct;
  }
  return null;
}

export function getCreatedAt(user: Partial<User> | null | undefined): Date | null {
  const raw = user && ((user as AnyObj).created_at ?? (user as AnyObj).createdAt);
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
