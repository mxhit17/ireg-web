import type { ProjectSummary, ProjectType, SavedProject } from "@/types/project";

import { api } from "./client";
import { isObj } from "./normalize";
import { toProjectSummary } from "./projects";

type AnyObj = Record<string, unknown>;

export interface SectionPagination {
  total: number;
  hasNextPage: boolean;
}

export interface HomePage {
  page: number;
  recent: ProjectSummary[];
  popular: ProjectSummary[];
  savedProjectIds: string[];
  pagination: { recent: SectionPagination; popular: SectionPagination };
}

const toSummaries = (v: unknown) =>
  Array.isArray(v) ? v.map(toProjectSummary).filter((p): p is ProjectSummary => !!p) : [];

function toSection(v: unknown, fallbackCount: number, limit: number): SectionPagination {
  if (!isObj(v)) return { total: fallbackCount, hasNextPage: fallbackCount === limit };
  return { total: Number(v.total ?? fallbackCount) || 0, hasNextPage: v.hasNextPage === true };
}

/**
 * GET home?page&limit (limit ≤ 50). With a bearer token:
 *  - recentProjects: newest first, excluding the user's saved projects
 *  - popularProjects: by popularity, excluding saved + this page's recent projects
 *  - savedProjectIds: ids only (details come from users/me/saved-projects)
 */
export async function getHome({ page = 1, limit = 6 } = {}): Promise<HomePage> {
  const body = await api.get<unknown>("home", { query: { page, limit } });
  const data: AnyObj = isObj(body) && isObj(body.data) ? body.data : {};
  const pagination: AnyObj = isObj(body) && isObj(body.pagination) ? body.pagination : {};
  const recent = toSummaries(data.recentProjects);
  const popular = toSummaries(data.popularProjects);
  return {
    page,
    recent,
    popular,
    savedProjectIds: Array.isArray(data.savedProjectIds) ? data.savedProjectIds.map(String) : [],
    pagination: {
      recent: toSection(pagination.recentProjects, recent.length, limit),
      popular: toSection(pagination.popularProjects, popular.length, limit),
    },
  };
}

// ---------------------------------------------------------------------------
// Saved projects
// ---------------------------------------------------------------------------

/** GET user-and-admin-management/users/me/saved-projects — newest saves first. */
export async function getSavedProjects(): Promise<SavedProject[]> {
  const body = await api.get<unknown>("user-and-admin-management/users/me/saved-projects");
  const data = isObj(body) && Array.isArray(body.data) ? body.data : [];
  return data.filter(isObj).map((p) => ({
    id: String(p.id),
    name: typeof p.name === "string" ? p.name : "Untitled project",
    slug: typeof p.slug === "string" ? p.slug : null,
    description: typeof p.description === "string" ? p.description : null,
    type: typeof p.project_type === "string" ? (p.project_type as ProjectType) : null,
    savedAt: typeof p.saved_at === "string" ? p.saved_at : null,
  }));
}

/** PUT projects/:id/save (idempotent). */
export const saveProject = (id: string) => api.put<unknown>(`projects/${id}/save`);

/** DELETE projects/:id/save (idempotent). */
export const unsaveProject = (id: string) => api.delete<unknown>(`projects/${id}/save`);
