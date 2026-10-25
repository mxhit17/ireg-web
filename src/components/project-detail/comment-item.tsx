"use client";

import { useState } from "react";
import { ChevronDown, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";

import { CommentComposer } from "@/components/project-detail/comment-composer";
import { UserAvatar } from "@/components/user/user-avatar";
import { useCurrentUser } from "@/hooks/use-auth";
import { useInView } from "@/hooks/use-in-view";
import { useCommentReaction, useDeleteComment, useReplies } from "@/hooks/use-project-detail";
import { isAdmin } from "@/lib/api/normalize";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectComment } from "@/types/project";

const MAX_INDENT_DEPTH = 3;

/**
 * One comment from the Figma project-view: avatar · name · time, text, and the action row
 * (👍 count, 👎 count, Reply, Delete). Replies render underneath with the thread line; top-level
 * threads expand automatically when scrolled into view, deeper ones on demand.
 */
export function CommentItem({
  comment,
  projectId,
  depth = 0,
}: {
  comment: ProjectComment;
  projectId: string;
  depth?: number;
}) {
  const user = useCurrentUser();
  const isReply = depth > 0;
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "200px" });
  const [expanded, setExpanded] = useState<boolean | null>(null); // null = automatic
  const [replying, setReplying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showReplies = expanded ?? (depth === 0 && comment.replyCount > 0 && inView);
  const replies = useReplies(comment.id, showReplies && comment.replyCount > 0);
  const reaction = useCommentReaction(comment);
  const del = useDeleteComment(projectId);

  const name = comment.user?.name ?? "IREG member";
  const canDelete = !!user && (user.id === comment.userId || isAdmin(user));
  const replyItems = replies.data?.pages.flatMap((p) => p.items) ?? [];
  const loadedReplies = replyItems.length;

  return (
    <div ref={ref} className="grid gap-2">
      <article className="grid gap-1" aria-label={`Comment by ${name}`}>
        <header className="flex min-w-0 items-center gap-2">
          <UserAvatar user={{ name }} className={isReply ? "size-5 text-[9px]" : "size-6 text-[10px]"} />
          <span className={cn("truncate font-semibold", isReply ? "text-xs" : "text-[13px]")}>{name}</span>
          <span aria-hidden className="size-[3px] shrink-0 rounded-full bg-subtle-foreground" />
          <time
            dateTime={comment.createdAt}
            title={new Date(comment.createdAt).toLocaleString("en-IN")}
            className={cn("shrink-0 text-subtle-foreground", isReply ? "text-[11px]" : "text-xs")}
          >
            {timeAgo(comment.createdAt)}
          </time>
        </header>

        <p
          className={cn(
            "leading-[1.45] break-words whitespace-pre-line text-slate-600",
            isReply ? "text-[13px]" : "text-sm",
          )}
        >
          {comment.content}
        </p>

        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2 text-xs" role="alert">
            <span className="font-medium text-destructive">
              Delete this comment{comment.replyCount > 0 ? " and its replies" : ""}?
            </span>
            <button
              type="button"
              onClick={() => del.mutate(comment, { onSettled: () => setConfirmDelete(false) })}
              disabled={del.isPending}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-destructive px-2 py-1 font-semibold text-white hover:bg-destructive/90 disabled:opacity-60"
            >
              {del.isPending && <Loader2 className="size-3 animate-spin" />}
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="cursor-pointer rounded-md px-2 py-1 font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="-ml-1.5 flex items-center gap-1 text-xs font-medium text-subtle-foreground">
            <ActionButton
              onClick={() => reaction.toggle("LIKE")}
              pressed={reaction.reaction === "LIKE"}
              label="Like"
              activeClass="text-primary"
            >
              <ThumbsUp className={cn("size-3.5", reaction.reaction === "LIKE" && "fill-primary/20")} aria-hidden />
              {reaction.likes !== null && <span>{reaction.likes}</span>}
            </ActionButton>
            <ActionButton
              onClick={() => reaction.toggle("DISLIKE")}
              pressed={reaction.reaction === "DISLIKE"}
              label="Dislike"
              activeClass="text-slate-700"
            >
              <ThumbsDown className={cn("size-3.5", reaction.reaction === "DISLIKE" && "fill-slate-700/15")} aria-hidden />
              {reaction.dislikes !== null && <span>{reaction.dislikes}</span>}
            </ActionButton>
            <ActionButton onClick={() => setReplying((r) => !r)} pressed={replying} label="Reply" activeClass="text-primary">
              Reply
            </ActionButton>
            {canDelete && (
              <ActionButton onClick={() => setConfirmDelete(true)} label="Delete" activeClass="" className="hover:text-destructive">
                Delete
              </ActionButton>
            )}
          </div>
        )}
      </article>

      {(replying || comment.replyCount > 0) && (
        <div className={cn("flex", depth >= MAX_INDENT_DEPTH && "-ml-4")}>
          <span aria-hidden className="mr-3 ml-[11px] w-px shrink-0 self-stretch bg-slate-300" />
          <div className="grid min-w-0 flex-1 gap-4 pt-1">
            {replying && (
              <CommentComposer
                projectId={projectId}
                parentCommentId={comment.id}
                replyingTo={name}
                autoFocus
                onDone={() => {
                  setReplying(false);
                  setExpanded(true);
                }}
              />
            )}

            {showReplies &&
              replyItems.map((r) => <CommentItem key={r.id} comment={r} projectId={projectId} depth={depth + 1} />)}

            {showReplies && replies.isPending && comment.replyCount > 0 && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Loading replies…
              </p>
            )}

            {!showReplies && comment.replyCount > 0 && (
              <RepliesToggle onClick={() => setExpanded(true)}>
                View {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
              </RepliesToggle>
            )}

            {showReplies && replies.hasNextPage && (
              <RepliesToggle onClick={() => replies.fetchNextPage()} loading={replies.isFetchingNextPage}>
                View more replies ({Math.max(comment.replyCount - loadedReplies, 0)})
              </RepliesToggle>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  pressed,
  label,
  activeClass,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pressed?: boolean;
  label: string;
  activeClass: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={typeof children === "string" ? undefined : label}
      className={cn(
        "inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40",
        pressed && cn("font-semibold", activeClass),
        className,
      )}
    >
      {children}
    </button>
  );
}

function RepliesToggle({
  children,
  onClick,
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex w-fit cursor-pointer items-center gap-1 rounded-md text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ChevronDown className="size-3.5" />}
      {children}
    </button>
  );
}
