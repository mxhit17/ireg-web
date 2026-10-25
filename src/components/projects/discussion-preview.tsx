"use client";

import { MessageSquarePlus } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectComment, TopDiscussions } from "@/types/project";

/** The grey "TOP DISCUSSIONS" box from the Figma thread card. */
export function DiscussionPreview({
  data,
  loading,
  error,
}: {
  data: TopDiscussions | undefined;
  loading: boolean;
  error: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 border-y border-border bg-[#fafbfc] p-4">
      <p className="text-xs font-bold tracking-wide text-subtle-foreground uppercase">Top discussions</p>

      {loading ? (
        <div className="grid gap-4" aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="grid gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-[13px] text-muted-foreground">Couldn&apos;t load discussions.</p>
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-4 text-center">
          <MessageSquarePlus className="size-5 text-subtle-foreground" aria-hidden />
          <p className="text-[13px] text-muted-foreground">No discussions yet — be the first to ask.</p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {data.items.map(({ comment, reply }) => (
            <li key={comment.id} className="grid gap-2">
              <CommentLine comment={comment} />
              {reply && (
                <div className="flex">
                  <span aria-hidden className="mr-2 ml-2 w-px shrink-0 self-stretch bg-slate-300" />
                  <CommentLine comment={reply} small />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentLine({ comment, small = false }: { comment: ProjectComment; small?: boolean }) {
  const name = comment.user?.name ?? "IREG member";
  return (
    <div className="grid min-w-0 flex-1 gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <UserAvatar
          user={{ name }}
          className={cn(small ? "size-5 text-[9px]" : "size-6 text-[10px]")}
        />
        <span className={cn("truncate font-semibold text-foreground", small ? "text-xs" : "text-[13px]")}>{name}</span>
        <span aria-hidden className="size-[3px] shrink-0 rounded-full bg-subtle-foreground" />
        <time
          dateTime={comment.createdAt}
          className={cn("shrink-0 text-subtle-foreground", small ? "text-[11px]" : "text-xs")}
        >
          {timeAgo(comment.createdAt)}
        </time>
      </div>
      <p
        className={cn(
          "leading-[1.4] break-words text-slate-600",
          small ? "line-clamp-2 text-xs" : "line-clamp-3 text-[13px]",
        )}
      >
        {comment.content}
      </p>
    </div>
  );
}
