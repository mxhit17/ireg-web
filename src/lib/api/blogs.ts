import type { Blog, BlogInput, BlogStatus } from "@/types/blog";

import { api } from "./client";
import { isObj } from "./normalize";

type AnyObj = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const status = (v: unknown): BlogStatus => (v === "DRAFT" || v === "ARCHIVED" ? v : "PUBLISHED");

/** Admin responses come as `{ data }` (create/update) or `{ blog }` (publish). */
const unwrapBlog = (body: unknown): unknown =>
  isObj(body) && isObj(body.data) ? body.data : isObj(body) && isObj(body.blog) ? body.blog : body;

export function toBlog(raw: unknown): Blog | null {
  if (!isObj(raw) || !raw.id) return null;
  const u = isObj(raw.users) ? raw.users : isObj(raw.author) ? raw.author : null;
  const createdAt = String(raw.created_at ?? raw.createdAt ?? "");
  return {
    id: String(raw.id),
    title: str(raw.title) ?? "Untitled",
    slug: String(raw.slug ?? ""),
    excerpt: str(raw.excerpt),
    body: typeof raw.body === "string" ? raw.body : "",
    coverImageUrl: str(raw.cover_image_url),
    sourceName: str(raw.source_name),
    sourceUrl: str(raw.source_url),
    status: status(raw.status),
    publishedAt: str(raw.published_at),
    createdAt,
    updatedAt: String(raw.updated_at ?? createdAt),
    author: u
      ? { id: String(u.id ?? ""), name: str(u.name), profileImageUrl: str(u.profile_image_url) }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Public (published only)
// ---------------------------------------------------------------------------

/** GET blogs — every published blog, newest first (no pagination on the API). */
export async function getBlogs(): Promise<Blog[]> {
  const body = await api.get<unknown>("blogs", { auth: false });
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.data) ? body.data : [];
  return list.map(toBlog).filter((b): b is Blog => !!b);
}

/** GET blogs/:slug */
export async function getBlog(slug: string): Promise<Blog> {
  const blog = toBlog(unwrapBlog(await api.get<unknown>(`blogs/${encodeURIComponent(slug)}`, { auth: false })));
  if (!blog) throw new Error("Blog not found");
  return blog;
}

// ---------------------------------------------------------------------------
// Admin — admin/blogs/*, ADMIN role required
// ---------------------------------------------------------------------------

/**
 * POST admin/blogs (multipart, optional `cover_image`). The backend makes the slug from the title
 * and always creates a DRAFT; publishing is a separate call.
 */
export async function createBlog(input: BlogInput, cover: File | null): Promise<Blog | null> {
  const form = new FormData();
  form.append("title", input.title.trim());
  form.append("body", input.body.trim());
  if (input.excerpt.trim()) form.append("excerpt", input.excerpt.trim());
  if (input.sourceName.trim()) form.append("source_name", input.sourceName.trim());
  if (input.sourceUrl.trim()) form.append("source_url", input.sourceUrl.trim());
  if (cover) form.append("cover_image", cover, cover.name);
  return toBlog(unwrapBlog(await api.post<unknown>("admin/blogs", form)));
}

/**
 * PATCH admin/blogs/:id. Text changes go as JSON so optional fields can be cleared with `null`
 * (multipart can't send null, and an empty `source_url` fails URL validation); a new cover goes in
 * a second, file-only multipart request.
 */
export async function updateBlog(id: string, changes: Partial<BlogInput>, cover: File | null): Promise<Blog | null> {
  const payload: AnyObj = {};
  if (changes.title !== undefined) payload.title = changes.title.trim();
  if (changes.body !== undefined) payload.body = changes.body.trim();
  if (changes.excerpt !== undefined) payload.excerpt = changes.excerpt.trim() || null;
  if (changes.sourceName !== undefined) payload.source_name = changes.sourceName.trim() || null;
  if (changes.sourceUrl !== undefined) payload.source_url = changes.sourceUrl.trim() || null;

  let latest: Blog | null = null;
  if (Object.keys(payload).length > 0) {
    latest = toBlog(unwrapBlog(await api.patch<unknown>(`admin/blogs/${id}`, payload)));
  }
  if (cover) {
    const form = new FormData();
    form.append("cover_image", cover, cover.name);
    latest = toBlog(unwrapBlog(await api.patch<unknown>(`admin/blogs/${id}`, form)));
  }
  return latest;
}

/** POST admin/blogs/:id/publish — fails with 400 if already published. */
export async function publishBlog(id: string): Promise<Blog | null> {
  return toBlog(unwrapBlog(await api.post<unknown>(`admin/blogs/${id}/publish`)));
}

/** DELETE admin/blogs/:id — soft delete; also removes the cover from Cloudinary. */
export async function deleteBlog(id: string): Promise<void> {
  await api.delete<unknown>(`admin/blogs/${id}`);
}
