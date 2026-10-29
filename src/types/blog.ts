export type BlogStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface BlogAuthor {
  id: string;
  name: string | null;
  profileImageUrl: string | null;
}

/** GET blogs, GET blogs/:slug and admin create/update/publish responses. */
export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  /** Public reads don't return it (they're PUBLISHED by definition). */
  status: BlogStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only on public reads. */
  author: BlogAuthor | null;
}

export interface BlogInput {
  title: string;
  excerpt: string;
  body: string;
  sourceName: string;
  sourceUrl: string;
}
