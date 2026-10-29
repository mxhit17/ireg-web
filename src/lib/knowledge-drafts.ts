import { createSnapshotStore } from "@/lib/local-snapshots";
import type { KnowledgeTopic } from "@/types/knowledge";

/**
 * Knowledge topics saved as DRAFT from this browser (no API lists drafts yet — see
 * lib/local-snapshots.ts). Published topics are dropped from the list.
 */
export const knowledgeDrafts = createSnapshotStore<KnowledgeTopic>("ireg_kb_drafts", (t) => t.status !== "PUBLISHED");
