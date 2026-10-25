"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/use-auth";
import { homeKeys } from "@/hooks/use-home";
import { isApiError } from "@/lib/api/errors";
import { isAdmin } from "@/lib/api/normalize";
import {
  approveProjectRequest,
  createProjectRequest,
  getMyProjectRequests,
  getPendingProjectRequests,
  rejectProjectRequest,
} from "@/lib/api/project-requests";
import type { CreateProjectRequestInput } from "@/types/project-request";

export const requestKeys = {
  mine: ["project-requests", "mine"] as const,
  pending: ["project-requests", "pending"] as const,
};

const errMsg = (err: unknown, fallback: string) => (isApiError(err) ? err.message : fallback);

export function useMyProjectRequests() {
  return useQuery({ queryKey: requestKeys.mine, queryFn: getMyProjectRequests, staleTime: 30 * 1000 });
}

export function useCreateProjectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectRequestInput) => createProjectRequest(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.mine });
      qc.invalidateQueries({ queryKey: requestKeys.pending });
    },
  });
}

/** Admin queue. Disabled for non-admins so they never hit the 403. */
export function usePendingProjectRequests() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: requestKeys.pending,
    queryFn: getPendingProjectRequests,
    enabled: isAdmin(user),
    staleTime: 30 * 1000,
  });
}

export function useApproveProjectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveProjectRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.pending });
      qc.invalidateQueries({ queryKey: homeKeys.home });
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't approve this request.")),
  });
}

export function useRejectProjectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectProjectRequest(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.pending });
      toast.success("Request rejected — the requester has been emailed the reason.");
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't reject this request.")),
  });
}
