import type { ProjectStatus, ProjectType } from "@/types/project";

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/** A user's "create this project" request (project_requests table), normalised. */
export interface ProjectRequest {
  id: string;
  builderName: string | null;
  name: string;
  description: string | null;
  type: ProjectType | null;
  status: ProjectStatus | null;
  location: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  imageUrl: string | null;
  requestStatus: RequestStatus;
  rejectionReason: string | null;
  /** Set once approved — the project that was created. */
  projectId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  /** Only on the admin list. */
  requester: { id: string; name: string; email: string } | null;
}

export interface CreateProjectRequestInput {
  builderName: string;
  name: string;
  address: string;
  image: File;
}
