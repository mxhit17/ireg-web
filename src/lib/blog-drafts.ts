import { createSnapshotStore } from "@/lib/local-snapshots";
import type { Blog } from "@/types/blog";

/** Blog drafts saved from this browser (no API lists drafts yet — see lib/local-snapshots.ts). */
export const blogDrafts = createSnapshotStore<Blog>("ireg_blog_drafts", (b) => b.status === "DRAFT");
