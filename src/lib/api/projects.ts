import type {
  CommentReaction,
  MyRating,
  ProjectComment,
  RatingCategoryCode,
  ProjectRatings,
  ProjectStatus,
  ProjectSummary,
  ProjectType,
  TopDiscussions,
} from "@/types/project";

import { api } from "./client";
import { isObj } from "./normalize";

type AnyObj = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

function firstImage(p: AnyObj): string | null {
  const lists = [p.images, p.project_images];
  for (const list of lists) {
    if (!Array.isArray(list) || list.length === 0) continue;
    const sorted = [...list].sort(
      (a, b) => (num(isObj(a) ? a.displayOrder ?? a.display_order : 0) ?? 0) - (num(isObj(b) ? b.displayOrder ?? b.display_order : 0) ?? 0),
    );
    for (const img of sorted) {
      if (isObj(img)) {
        const url = str(img.imageUrl ?? img.image_url);
        if (url) return url;
      }
    }
  }
  return null;
}

export function toProjectSummary(raw: unknown): ProjectSummary | null {
  if (!isObj(raw) || !raw.id) return null;
  const builder = isObj(raw.builders) ? raw.builders : null;
  const hasStats = raw.views_30d !== undefined;
  return {
    id: String(raw.id),
    name: str(raw.name) ?? "Untitled project",
    slug: str(raw.slug),
    builderName: str(raw.builder_name) ?? (builder ? str(builder.name) : null),
    type: (str(raw.project_type) as ProjectType | null) ?? null,
    status: (str(raw.status) as ProjectStatus | null) ?? null,
    location: str(raw.location),
    locality: str(raw.locality),
    city: str(raw.city),
    state: str(raw.state),
    minPrice: num(raw.min_price),
    maxPrice: num(raw.max_price),
    currency: str(raw.currency) ?? "INR",
    imageUrl: firstImage(raw),
    ...(hasStats && {
      stats: {
        views30d: num(raw.views_30d) ?? 0,
        saves30d: num(raw.saves_30d) ?? 0,
        comments30d: num(raw.comments_30d) ?? 0,
      },
    }),
  };
}

function toList(body: unknown): ProjectSummary[] {
  const data = isObj(body) ? body.data : body;
  return Array.isArray(data) ? data.map(toProjectSummary).filter((p): p is ProjectSummary => !!p) : [];
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export interface ProjectPage {
  items: ProjectSummary[];
  /** Cursor for the next page (offset for popular, page number for search), or null at the end. */
  next: number | null;
}

/** GET popularity/popular?limit&offset — ranked by popularity_score (recomputed every 30 min). Max limit 50. */
export async function getPopularProjects({ limit = 12, offset = 0 } = {}): Promise<ProjectPage> {
  const body = await api.get<unknown>("popularity/popular", { query: { limit, offset }, auth: false });
  const items = toList(body);
  return { items, next: items.length === limit ? offset + limit : null };
}

export interface SearchParams {
  q?: string;
  city?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  page?: number;
  limit?: number;
}

/** GET projects/search — name/slug/location/locality/city/state contains `q`. */
export async function searchProjects({ page = 1, limit = 12, ...filters }: SearchParams): Promise<ProjectPage> {
  const body = await api.get<unknown>("projects/search", {
    query: { ...filters, q: filters.q?.trim(), page, limit },
    auth: false,
  });
  const items = toList(body);
  const pagination = isObj(body) && isObj(body.pagination) ? body.pagination : null;
  const hasNext = pagination ? pagination.hasNextPage === true : items.length === limit;
  return { items, next: hasNext ? page + 1 : null };
}

/** GET projects/:id — the raw project (with `builders` and `project_images`), normalised. */
export async function getProjectById(projectId: string): Promise<ProjectSummary & { description: string | null }> {
  const body = await api.get<unknown>(`projects/${projectId}`, { auth: false });
  const raw = isObj(body) && isObj(body.data) && body.data.id ? body.data : body;
  const project = toProjectSummary(raw);
  if (!project) throw new Error("Project not found");
  return { ...project, description: isObj(raw) ? str(raw.description) : null };
}

// ---------------------------------------------------------------------------
// Per-project data used on cards
// ---------------------------------------------------------------------------

/** GET projects/:id/ratings — overall + per-category averages (rounded to 1 dp by the API). */
export async function getProjectRatings(projectId: string): Promise<ProjectRatings> {
  return api.get<ProjectRatings>(`projects/${projectId}/ratings`, { auth: false });
}

function toReaction(v: unknown): CommentReaction {
  return v === "LIKE" || v === "DISLIKE" ? v : null;
}

export function toComment(raw: unknown): ProjectComment | null {
  if (!isObj(raw) || !raw.id) return null;
  const user = isObj(raw.user) ? raw.user : isObj(raw.users) ? raw.users : null;
  const counts = isObj(raw.reactionCounts) ? raw.reactionCounts : isObj(raw.reactions) ? raw.reactions : null;
  return {
    id: String(raw.id),
    content: str(raw.content) ?? "",
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
    user: user ? { id: String(user.id), name: str(user.name) ?? "IREG member" } : null,
    userId: str(raw.userId ?? raw.user_id) ?? (user ? String(user.id) : null),
    replyCount: num(raw.replyCount) ?? 0,
    parentId: str(raw.parent_comment_id ?? raw.parentCommentId),
    // Not returned by the API today — picked up automatically if the backend adds them.
    likeCount: num(raw.likeCount ?? raw.likesCount ?? raw.like_count ?? counts?.LIKE ?? counts?.likes),
    dislikeCount: num(raw.dislikeCount ?? raw.dislikesCount ?? raw.dislike_count ?? counts?.DISLIKE ?? counts?.dislikes),
    myReaction: toReaction(raw.myReaction ?? raw.userReaction ?? raw.my_reaction),
  };
}

export interface CommentPage {
  items: ProjectComment[];
  total: number;
  page: number;
  hasNextPage: boolean;
}

function toComments(body: unknown, page = 1): CommentPage {
  const data = isObj(body) && Array.isArray(body.data) ? body.data : [];
  const items = data.map(toComment).filter((c): c is ProjectComment => !!c);
  const p = isObj(body) && isObj(body.pagination) ? body.pagination : null;
  const total = num(p?.total ?? p?.totalItems) ?? items.length;
  return { items, total, page, hasNextPage: p?.hasNextPage === true };
}

export type CommentSort = "newest" | "oldest";

/** GET projects/:id/comments — top-level comments only (replies via getCommentReplies). Max limit 100. */
export async function getProjectComments(
  projectId: string,
  { page = 1, limit = 10, sortBy = "newest" }: { page?: number; limit?: number; sortBy?: CommentSort } = {},
) {
  const body = await api.get<unknown>(`projects/${projectId}/comments`, { query: { page, limit, sortBy } });
  return toComments(body, page);
}

/** GET comments/:id/replies — direct replies (each may have its own replyCount). */
export async function getCommentReplies(
  commentId: string,
  { page = 1, limit = 10, sortBy = "oldest" }: { page?: number; limit?: number; sortBy?: CommentSort } = {},
) {
  const body = await api.get<unknown>(`comments/${commentId}/replies`, { query: { page, limit, sortBy } });
  return toComments(body, page);
}

// ---------------------------------------------------------------------------
// Writes used on the project page
// ---------------------------------------------------------------------------

/** POST projects/:id/comments — `parentCommentId` makes it a reply. Content 1–5000 chars. */
export async function createComment(projectId: string, input: { content: string; parentCommentId?: string }) {
  const body = await api.post<unknown>(`projects/${projectId}/comments`, {
    content: input.content,
    ...(input.parentCommentId ? { parentCommentId: input.parentCommentId } : {}),
  });
  return toComment(isObj(body) ? body.data : null);
}

/** DELETE comments/:id — the author or an admin; also soft-deletes all nested replies. */
export const deleteComment = (commentId: string) => api.delete<unknown>(`comments/${commentId}`);

/** PUT comments/:id/reaction — LIKE, DISLIKE, or null to clear. */
export const setCommentReaction = (commentId: string, reaction: CommentReaction) =>
  api.put<unknown>(`comments/${commentId}/reaction`, { reaction });

/** GET projects/:id/my-rating — the signed-in user's scores (null per category if not rated). */
export async function getMyRating(projectId: string): Promise<MyRating> {
  const body = await api.get<unknown>(`projects/${projectId}/my-rating`);
  const b = isObj(body) ? body : {};
  const ratings = Array.isArray(b.ratings) ? b.ratings.filter(isObj) : [];
  return {
    overall: num(b.overall_rating),
    scores: Object.fromEntries(
      ratings.map((r) => [String(r.code), num(r.score)]),
    ) as MyRating["scores"],
  };
}

/** POST projects/:id/ratings — all five categories, 0–5 (one decimal allowed). Upserts. */
export const rateProject = (projectId: string, scores: Record<RatingCategoryCode, number>) =>
  api.post<unknown>(`projects/${projectId}/ratings`, scores);

/** POST projects/:id/view — de-duplicated per visitor for 30 minutes by the backend. */
export const recordProjectView = (projectId: string, visitorId: string) =>
  api.post<unknown>(`projects/${projectId}/view`, { visitorId });

/**
 * The card's "Top discussions": the 2 newest top-level comments, plus the first reply of the
 * first comment that has replies (matches the Figma thread card). 1–2 requests per project.
 */
export async function getTopDiscussions(projectId: string, count = 2): Promise<TopDiscussions> {
  const { items, total } = await getProjectComments(projectId, { limit: count, sortBy: "newest" });
  const withReplies = items.find((c) => c.replyCount > 0);
  let reply: ProjectComment | null = null;
  if (withReplies) {
    try {
      reply = (await getCommentReplies(withReplies.id, { limit: 1 })).items[0] ?? null;
    } catch {
      reply = null; // a missing reply shouldn't hide the comments
    }
  }
  return {
    total,
    items: items.map((comment) => ({ comment, reply: comment.id === withReplies?.id ? reply : null })),
  };
}
