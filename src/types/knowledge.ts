/** Prisma enums `knowledge_level` and `content_status`. */
export type KnowledgeLevel = "BEGINNER" | "INTERMEDIATE" | "PROFESSIONAL";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export const KNOWLEDGE_LEVELS: { value: KnowledgeLevel; label: string }[] = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "PROFESSIONAL", label: "Professional" },
];

export interface TopicSummary {
  id: string;
  title: string;
  slug: string;
  level: KnowledgeLevel;
  /** Only on GET knowledge/categories/:slug/topics. */
  simpleExplanation: string | null;
}

/** GET knowledge/categories — each with its PUBLISHED topics. */
export interface KnowledgeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  topics: TopicSummary[];
}

export interface KnowledgeTag {
  id: string;
  name: string;
  slug: string;
}

/** GET knowledge/topics/:slug and admin create/update/publish responses. */
export interface KnowledgeTopic {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  level: KnowledgeLevel;
  definition: string;
  simpleExplanation: string | null;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string } | null;
  tags: KnowledgeTag[];
}

export interface TopicInput {
  categoryId: string;
  title: string;
  level: KnowledgeLevel;
  definition: string;
  simpleExplanation: string;
  status?: ContentStatus;
}

export interface CategoryInput {
  name: string;
  description?: string;
  displayOrder?: number;
}
