"use client";

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getAdminFeedback, getMyFeedback, submitFeedback } from "@/lib/api/feedback";
import { isApiError } from "@/lib/api/errors";
import type { FeedbackFilters, FeedbackInput, MyFeedback } from "@/types/feedback";

export const feedbackKeys = {
  all: ["feedback"] as const,
  mine: ["feedback", "me"] as const,
  admin: (filters: FeedbackFilters) => ["feedback", "admin", filters] as const,
};

const ADMIN_PAGE_SIZE = 20;

export function useMyFeedback() {
  return useQuery({ queryKey: feedbackKeys.mine, queryFn: getMyFeedback, staleTime: 60 * 1000 });
}

export function useSubmitFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FeedbackInput) => submitFeedback(input),
    onSuccess: (saved) => {
      if (saved) {
        qc.setQueryData<MyFeedback>(feedbackKeys.mine, (prev) => ({
          latest: saved,
          totalSubmitted: (prev?.totalSubmitted ?? 0) + 1,
        }));
      }
      qc.invalidateQueries({ queryKey: feedbackKeys.all });
    },
    onError: (err) => toast.error(isApiError(err) ? err.message : "Couldn't send your feedback. Please try again."),
  });
}

/** Admin list with "Load more"; the summary always comes from the latest page. */
export function useAdminFeedback(filters: FeedbackFilters) {
  const query = useInfiniteQuery({
    queryKey: feedbackKeys.admin(filters),
    queryFn: ({ pageParam }) => getAdminFeedback(pageParam, ADMIN_PAGE_SIZE, filters),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
  const pages = query.data?.pages ?? [];
  return {
    ...query,
    items: pages.flatMap((p) => p.items),
    summary: pages[pages.length - 1]?.summary ?? null,
    total: pages[0]?.totalItems ?? 0,
  };
}
