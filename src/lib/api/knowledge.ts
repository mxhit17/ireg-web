import type {
  CategoryInput,
  ContentStatus,
  KnowledgeCategory,
  KnowledgeLevel,
  KnowledgeTag,
  KnowledgeTopic,
  TopicInput,
  TopicSummary,
} from "@/types/knowledge";

import { api } from "./client";
import { isObj } from "./normalize";

type AnyObj = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const level = (v: unknown): KnowledgeLevel =>
  v === "INTERMEDIATE" || v === "PROFESSIONAL" ? v : "BEGINNER";
const status = (v: unknown): ContentStatus => (v === "PUBLISHED" || v === "ARCHIVED" ? v : "DRAFT");
const unwrapData = (body: unknown): unknown => (isObj(body) && "data" in body && isObj(body.data) ? body.data : body);
const asArray = (body: unknown): unknown[] =>
  Array.isArray(body) ? body : isObj(body) && Array.isArray(body.data) ? body.data : [];

function toTopicSummary(raw: unknown): TopicSummary | null {
  if (!isObj(raw) || !raw.id) return null;
  return {
    id: String(raw.id),
    title: str(raw.title) ?? "Untitled",
    slug: String(raw.slug ?? ""),
    level: level(raw.level),
    simpleExplanation: str(raw.simple_explanation),
  };
}

function toCategory(raw: unknown): KnowledgeCategory | null {
  if (!isObj(raw) || !raw.id) return null;
  const topics = Array.isArray(raw.knowledge_topics) ? raw.knowledge_topics : [];
  return {
    id: String(raw.id),
    name: str(raw.name) ?? "Untitled",
    slug: String(raw.slug ?? ""),
    description: str(raw.description),
    displayOrder: Number(raw.display_order ?? 0) || 0,
    topics: topics.map(toTopicSummary).filter((t): t is TopicSummary => !!t),
  };
}

export function toTopic(raw: unknown): KnowledgeTopic | null {
  if (!isObj(raw) || !raw.id) return null;
  const cat = isObj(raw.knowledge_categories) ? raw.knowledge_categories : null;
  const tagLinks = Array.isArray(raw.knowledge_topic_tags) ? raw.knowledge_topic_tags : [];
  const tags = tagLinks
    .map((l) => (isObj(l) && isObj(l.knowledge_tags) ? (l.knowledge_tags as AnyObj) : null))
    .filter((t): t is AnyObj => !!t)
    .map<KnowledgeTag>((t) => ({ id: String(t.id), name: str(t.name) ?? "", slug: String(t.slug ?? "") }));
  return {
    id: String(raw.id),
    categoryId: String(raw.category_id ?? cat?.id ?? ""),
    title: str(raw.title) ?? "Untitled",
    slug: String(raw.slug ?? ""),
    level: level(raw.level),
    definition: typeof raw.definition === "string" ? raw.definition : "",
    simpleExplanation: str(raw.simple_explanation),
    status: status(raw.status),
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
    category: cat ? { id: String(cat.id), name: str(cat.name) ?? "", slug: String(cat.slug ?? "") } : null,
    tags,
  };
}

// ---------------------------------------------------------------------------
// Public (read)
// ---------------------------------------------------------------------------

/** GET knowledge/categories — ordered by display_order, each with its published topics. */
export async function getKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  const body = await api.get<unknown>("knowledge/categories", { auth: false });
  return asArray(body)
    .map(toCategory)
    .filter((c): c is KnowledgeCategory => !!c);
}

/** GET knowledge/categories/:slug/topics → { category, topics } (published only, A–Z). */
export async function getCategoryTopics(slug: string) {
  const body = await api.get<unknown>(`knowledge/categories/${encodeURIComponent(slug)}/topics`, { auth: false });
  const b = isObj(body) ? (unwrapData(body) as AnyObj) : {};
  const c = isObj(b.category) ? b.category : null;
  return {
    category: c
      ? { id: String(c.id), name: str(c.name) ?? "", slug: String(c.slug ?? slug), description: str(c.description) }
      : null,
    topics: (Array.isArray(b.topics) ? b.topics : []).map(toTopicSummary).filter((t): t is TopicSummary => !!t),
  };
}

/** GET knowledge/topics/:slug (published only). */
export async function getKnowledgeTopic(slug: string): Promise<KnowledgeTopic> {
  const topic = toTopic(unwrapData(await api.get<unknown>(`knowledge/topics/${encodeURIComponent(slug)}`, { auth: false })));
  if (!topic) throw new Error("Topic not found");
  return topic;
}

/** GET knowledge/topics/search?q — title, definition and simple explanation (published only). */
export async function searchKnowledgeTopics(q: string, { limit = 20, offset = 0 } = {}): Promise<KnowledgeTopic[]> {
  const body = await api.get<unknown>("knowledge/topics/search", { query: { q, limit, offset }, auth: false });
  return asArray(body)
    .map(toTopic)
    .filter((t): t is KnowledgeTopic => !!t);
}

// ---------------------------------------------------------------------------
// Admin (write) — admin/knowledge/*, ADMIN role required
// ---------------------------------------------------------------------------

/** POST admin/knowledge/categories — slug is generated from the name by the backend. */
export async function createKnowledgeCategory(input: CategoryInput): Promise<KnowledgeCategory | null> {
  const body = await api.post<unknown>("admin/knowledge/categories", {
    name: input.name.trim(),
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(input.displayOrder !== undefined ? { display_order: input.displayOrder } : {}),
  });
  return toCategory(unwrapData(body));
}

/** POST admin/knowledge/topics — status defaults to DRAFT on the backend. */
export async function createKnowledgeTopic(input: TopicInput): Promise<KnowledgeTopic | null> {
  const body = await api.post<unknown>("admin/knowledge/topics", {
    category_id: input.categoryId,
    title: input.title.trim(),
    level: input.level,
    definition: input.definition.trim(),
    ...(input.simpleExplanation.trim() ? { simple_explanation: input.simpleExplanation.trim() } : {}),
    ...(input.status ? { status: input.status } : {}),
  });
  return toTopic(unwrapData(body));
}

/** PATCH admin/knowledge/topics/:id — any subset; `simple_explanation: null` clears it. */
export async function updateKnowledgeTopic(id: string, input: Partial<TopicInput>): Promise<KnowledgeTopic | null> {
  const payload: AnyObj = {};
  if (input.categoryId !== undefined) payload.category_id = input.categoryId;
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.level !== undefined) payload.level = input.level;
  if (input.definition !== undefined) payload.definition = input.definition.trim();
  if (input.simpleExplanation !== undefined) payload.simple_explanation = input.simpleExplanation.trim() || null;
  if (input.status !== undefined) payload.status = input.status;
  return toTopic(unwrapData(await api.patch<unknown>(`admin/knowledge/topics/${id}`, payload)));
}

/** POST admin/knowledge/topics/:id/publish */
export async function publishKnowledgeTopic(id: string): Promise<KnowledgeTopic | null> {
  return toTopic(unwrapData(await api.post<unknown>(`admin/knowledge/topics/${id}/publish`)));
}
