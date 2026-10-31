"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/use-auth";
import { homeKeys } from "@/hooks/use-home";
import { projectKeys } from "@/hooks/use-projects";
import { isApiError } from "@/lib/api/errors";
import {
  createComment,
  deleteComment,
  getCommentReplies,
  getMyRating,
  getProjectComments,
  rateProject,
  recordProjectView,
  setCommentReaction,
  type CommentPage,
  type CommentSort,
} from "@/lib/api/projects";
import { getVisitorId } from "@/lib/visitor";
import type { CommentReaction, ProjectComment, RatingCategoryCode } from "@/types/project";

export const COMMENTS_PAGE_SIZE = 10;
export const REPLIES_PAGE_SIZE = 5;

export const detailKeys = {
  comments: (projectId: string, sort: CommentSort) => [...projectKeys.all, projectId, "comments", sort] as const,
  commentsAll: (projectId: string) => [...projectKeys.all, projectId, "comments"] as const,
  replies: (commentId: string) => ["comments", commentId, "replies"] as const,
  myRating: (projectId: string) => [...projectKeys.all, projectId, "my-rating"] as const,
  reactions: ["comment-reactions"] as const,
};

const errMsg = (err: unknown, fallback: string) => (isApiError(err) ? err.message : fallback);

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function useProjectComments(projectId: string, sort: CommentSort) {
  return useInfiniteQuery({
    queryKey: detailKeys.comments(projectId, sort),
    queryFn: ({ pageParam }) => getProjectComments(projectId, { page: pageParam, limit: COMMENTS_PAGE_SIZE, sortBy: sort }),
    initialPageParam: 1,
    getNextPageParam: (last: CommentPage) => (last.hasNextPage ? last.page + 1 : undefined),
    staleTime: 30 * 1000,
  });
}

/** Replies load on demand (when a thread is expanded). Oldest first, like a conversation. */
export function useReplies(commentId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: detailKeys.replies(commentId),
    queryFn: ({ pageParam }) => getCommentReplies(commentId, { page: pageParam, limit: REPLIES_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last: CommentPage) => (last.hasNextPage ? last.page + 1 : undefined),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useMyRating(projectId: string) {
  const user = useCurrentUser();
  return useQuery({
    queryKey: detailKeys.myRating(projectId),
    queryFn: () => getMyRating(projectId),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/** POST projects/:id/view once per page visit (the backend ignores repeats within 30 min). */
export function useRecordProjectView(projectId: string) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === projectId) return;
    sent.current = projectId;
    recordProjectView(projectId, getVisitorId()).catch(() => {
      /* analytics only — never bother the user */
    });
  }, [projectId]);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Refresh everything that shows this project's comments (thread, replies, home card preview). */
function invalidateDiscussion(qc: QueryClient, projectId: string, parentId?: string | null) {
  qc.invalidateQueries({ queryKey: detailKeys.commentsAll(projectId) });
  qc.invalidateQueries({ queryKey: projectKeys.topDiscussions(projectId) });
  if (parentId) qc.invalidateQueries({ queryKey: detailKeys.replies(parentId) });
}

export function useCreateComment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: string; parentCommentId?: string }) => createComment(projectId, input),
    onSuccess: (_c, { parentCommentId }) => {
      invalidateDiscussion(qc, projectId, parentCommentId);
      toast.success(parentCommentId ? "Reply posted" : "Comment posted");
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't post your comment. Please try again.")),
  });
}

export function useDeleteComment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comment: ProjectComment) => deleteComment(comment.id),
    onSuccess: (_d, comment) => {
      invalidateDiscussion(qc, projectId, comment.parentId);
      toast.success("Comment deleted");
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't delete the comment.")),
  });
}

/**
 * The comments API doesn't (yet) return the user's own reaction, so reactions made in this session
 * are remembered in the query cache. If the API starts sending `myReaction`, that takes over.
 */
export function useCommentReaction(comment: ProjectComment) {
  const qc = useQueryClient();
  const local = useQuery({
    queryKey: detailKeys.reactions,
    queryFn: () => ({}) as Record<string, CommentReaction>,
    initialData: {} as Record<string, CommentReaction>,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const current: CommentReaction =
    comment.id in local.data ? (local.data[comment.id] ?? null) : comment.myReaction;

  const mutation = useMutation({
    mutationFn: (next: CommentReaction) => setCommentReaction(comment.id, next),
    onMutate: (next) => {
      const prev = current;
      qc.setQueryData(detailKeys.reactions, (old: Record<string, CommentReaction> | undefined) => ({
        ...old,
        [comment.id]: next,
      }));
      return { prev };
    },
    onError: (err, _next, ctx) => {
      qc.setQueryData(detailKeys.reactions, (old: Record<string, CommentReaction> | undefined) => ({
        ...old,
        [comment.id]: ctx?.prev ?? null,
      }));
      toast.error(errMsg(err, "Couldn't save your reaction."));
    },
  });

  // Adjust server counts (if any) for the change made locally.
  const base = comment.myReaction;
  const delta = (kind: "LIKE" | "DISLIKE") => (current === kind ? 1 : 0) - (base === kind ? 1 : 0);
  const likes = comment.likeCount === null ? null : Math.max(0, comment.likeCount + delta("LIKE"));
  const dislikes = comment.dislikeCount === null ? null : Math.max(0, comment.dislikeCount + delta("DISLIKE"));

  return {
    reaction: current,
    likes,
    dislikes,
    toggle: (kind: "LIKE" | "DISLIKE") => mutation.mutate(current === kind ? null : kind),
    pending: mutation.isPending,
  };
}

export function useRateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scores: Record<RatingCategoryCode, number>) => rateProject(projectId, scores),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.ratings(projectId) });
      qc.invalidateQueries({ queryKey: detailKeys.myRating(projectId) });
      qc.invalidateQueries({ queryKey: homeKeys.home });
      toast.success("Thanks for rating this project!");
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't submit your rating. Please try again.")),
  });
}
