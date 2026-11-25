import type {
  AdminFeedback,
  AdminFeedbackPage,
  Feedback,
  FeedbackFilters,
  FeedbackInput,
  FeedbackSummary,
  MyFeedback,
} from "@/types/feedback";

import { api } from "./client";
import { isObj, unwrap } from "./normalize";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function toFeedback(raw: unknown): Feedback | null {
  if (!isObj(raw) || !raw.id) return null;
  return {
    id: String(raw.id),
    rating: num(raw.rating),
    message: str(raw.message),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
  };
}

function toAdminFeedback(raw: unknown): AdminFeedback | null {
  const base = toFeedback(raw);
  if (!base || !isObj(raw)) return null;
  const u = isObj(raw.user) ? raw.user : isObj(raw.users) ? raw.users : null;
  return {
    ...base,
    user: u
      ? {
          id: String(u.id ?? ""),
          name: str(u.name),
          email: str(u.email),
          profileImageUrl: str(u.profile_image_url),
        }
      : null,
  };
}

function toSummary(raw: unknown): FeedbackSummary {
  const s = isObj(raw) ? raw : {};
  const dist = isObj(s.distribution) ? s.distribution : {};
  const distribution: Record<number, number> = {};
  for (let r = 1; r <= 10; r++) distribution[r] = num(dist[String(r)]);
  return {
    totalResponses: num(s.totalResponses),
    averageRating: numOrNull(s.averageRating),
    npsScore: numOrNull(s.npsScore),
    promoters: num(s.promoters),
    passives: num(s.passives),
    detractors: num(s.detractors),
    distribution,
  };
}

/** POST feedback — `{ rating: 1–10, message?: string }`. Empty message is sent as null. */
export async function submitFeedback(input: FeedbackInput): Promise<Feedback | null> {
  const message = input.message.trim();
  const body = await api.post<unknown>("feedback", { rating: input.rating, message: message || null });
  return toFeedback(unwrap(body));
}

/** GET feedback/me — the signed-in user's latest feedback. */
export async function getMyFeedback(): Promise<MyFeedback> {
  const body = await api.get<unknown>("feedback/me");
  return {
    latest: toFeedback(unwrap(body)),
    totalSubmitted: isObj(body) ? num(body.totalSubmitted) : 0,
  };
}

/** GET admin/feedback — ADMIN only. */
export async function getAdminFeedback(page: number, limit: number, filters: FeedbackFilters): Promise<AdminFeedbackPage> {
  const body = await api.get<unknown>("admin/feedback", {
    query: {
      page,
      limit,
      sortBy: filters.sortBy,
      minRating: filters.minRating,
      maxRating: filters.maxRating,
      hasMessage: filters.hasMessage,
    },
  });
  const b = isObj(body) ? body : {};
  const list = Array.isArray(b.data) ? b.data : [];
  const p = isObj(b.pagination) ? b.pagination : {};
  return {
    items: list.map(toAdminFeedback).filter((f): f is AdminFeedback => !!f),
    summary: toSummary(b.summary),
    page: num(p.page, page),
    totalItems: num(p.totalItems),
    hasNextPage: p.hasNextPage === true,
  };
}
