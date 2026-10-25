"use client";

import { useState } from "react";
import { AlertCircle, Loader2, MessagesSquare } from "lucide-react";

import { CommentComposer } from "@/components/project-detail/comment-composer";
import { CommentItem } from "@/components/project-detail/comment-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectComments } from "@/hooks/use-project-detail";
import { isApiError } from "@/lib/api/errors";
import type { CommentSort } from "@/lib/api/projects";
import { cn } from "@/lib/utils";

/** Comment box + "DISCUSSIONS" thread from the Figma project-view. */
export function DiscussionSection({ projectId }: { projectId: string }) {
  const [sort, setSort] = useState<CommentSort>("newest");
  const comments = useProjectComments(projectId, sort);
  const items = comments.data?.pages.flatMap((p) => p.items) ?? [];
  const total = comments.data?.pages[0]?.total ?? 0;

  return (
    <section aria-labelledby="discussions-heading" className="grid gap-5">
      <CommentComposer projectId={projectId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="discussions-heading"
          className="flex items-center gap-2 text-lg font-semibold tracking-wide text-subtle-foreground uppercase"
        >
          Discussions
          {total > 0 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold tracking-normal text-muted-foreground normal-case">
              {total}
            </span>
          )}
        </h2>
        <div role="group" aria-label="Sort discussions" className="flex rounded-lg bg-secondary p-0.5 text-xs font-semibold">
          {(["newest", "oldest"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              aria-pressed={sort === s}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1.5 capitalize transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                sort === s ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {comments.isPending ? (
        <div className="grid gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-3.5 w-32" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          ))}
        </div>
      ) : comments.isError && items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center">
          <AlertCircle className="size-6 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {isApiError(comments.error) ? comments.error.message : "Couldn't load discussions."}
          </p>
          <Button variant="outline" size="sm" onClick={() => comments.refetch()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center">
          <MessagesSquare className="size-6 text-subtle-foreground" />
          <p className="font-semibold">No discussions yet</p>
          <p className="text-sm text-muted-foreground">
            Ask about possession dates, water supply, maintenance — or share your experience.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {items.map((c) => (
            <CommentItem key={c.id} comment={c} projectId={projectId} />
          ))}
          {comments.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => comments.fetchNextPage()} disabled={comments.isFetchingNextPage}>
                {comments.isFetchingNextPage && <Loader2 className="animate-spin" />}
                Load more discussions
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
