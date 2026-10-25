import type { ProjectStatus, ProjectType } from "@/types/project";
import type { CreateProjectRequestInput, ProjectRequest, RequestStatus } from "@/types/project-request";

import { api } from "./client";
import { isObj } from "./normalize";
import { toProjectSummary } from "./projects";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

export function toProjectRequest(raw: unknown): ProjectRequest | null {
  if (!isObj(raw) || !raw.id) return null;
  const requester = isObj(raw.users_project_requests_requester_idTousers)
    ? raw.users_project_requests_requester_idTousers
    : isObj(raw.requester)
      ? raw.requester
      : null;
  const status = str(raw.request_status);
  return {
    id: String(raw.id),
    builderName: str(raw.builder_name),
    name: str(raw.name) ?? "Untitled project",
    description: str(raw.description),
    type: str(raw.project_type) as ProjectType | null,
    status: str(raw.status) as ProjectStatus | null,
    location: str(raw.location),
    locality: str(raw.locality),
    city: str(raw.city),
    state: str(raw.state),
    imageUrl: str(raw.image_url),
    requestStatus: (status === "APPROVED" || status === "REJECTED" ? status : "PENDING") as RequestStatus,
    rejectionReason: str(raw.rejection_reason),
    projectId: str(raw.project_id),
    createdAt: String(raw.created_at ?? ""),
    reviewedAt: str(raw.reviewed_at),
    requester: requester
      ? { id: String(requester.id), name: str(requester.name) ?? "IREG member", email: str(requester.email) ?? "" }
      : null,
  };
}

function toList(body: unknown): ProjectRequest[] {
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.data) ? body.data : [];
  return list.map(toProjectRequest).filter((r): r is ProjectRequest => !!r);
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

/**
 * POST projects/requests (multipart). The form only collects builder, name, address and one photo;
 * the address goes to `location`. Every other field is optional and can be filled in by the admin.
 */
export async function createProjectRequest(input: CreateProjectRequestInput): Promise<ProjectRequest | null> {
  const form = new FormData();
  form.append("builder_name", input.builderName.trim());
  form.append("name", input.name.trim());
  form.append("location", input.address.trim());
  form.append("file", input.image, input.image.name);
  const body = await api.post<unknown>("projects/requests", form);
  return toProjectRequest(isObj(body) ? (body.request ?? body.data) : null);
}

/** GET projects/requests/mine — the signed-in user's requests and their review status. */
export async function getMyProjectRequests(): Promise<ProjectRequest[]> {
  return toList(await api.get<unknown>("projects/requests/mine"));
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** GET projects/requests — all PENDING requests (ADMIN only). */
export async function getPendingProjectRequests(): Promise<ProjectRequest[]> {
  return toList(await api.get<unknown>("projects/requests"));
}

/** POST projects/requests/:id/approve — creates the project (and builder if new); returns it. */
export async function approveProjectRequest(id: string) {
  const body = await api.post<unknown>(`projects/requests/${id}/approve`);
  const raw = isObj(body) && isObj(body.data) && body.data.id ? body.data : body;
  return toProjectSummary(raw);
}

/** POST projects/requests/:id/reject — the reason is emailed to the requester. */
export const rejectProjectRequest = (id: string, reason: string) =>
  api.post<unknown>(`projects/requests/${id}/reject`, { reason: reason.trim() });
