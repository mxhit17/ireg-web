"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCreateComment } from "@/hooks/use-project-detail";
import { cn } from "@/lib/utils";

const MAX = 5000; // CreateProjectCommentDto

/**
 * The Figma "Start writing something" box. Collapsed it's the grey pill; on focus it grows into a
 * textarea with Post/Cancel. The `reply` variant is used inline under a comment.
 */
export function CommentComposer({
  projectId,
  parentCommentId,
  replyingTo,
  autoFocus = false,
  onDone,
  className,
}: {
  projectId: string;
  parentCommentId?: string;
  replyingTo?: string;
  autoFocus?: boolean;
  onDone?: () => void;
  className?: string;
}) {
  const user = useCurrentUser();
  const create = useCreateComment(projectId);
  const isReply = !!parentCommentId;
  const [expanded, setExpanded] = useState(isReply);
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus || (expanded && !isReply)) ref.current?.focus();
  }, [autoFocus, expanded, isReply]);

  const trimmed = text.trim();
  const tooLong = text.length > MAX;

  function submit() {
    if (!trimmed || tooLong || create.isPending) return;
    create.mutate(
      { content: trimmed, parentCommentId },
      {
        onSuccess: () => {
          setText("");
          if (!isReply) setExpanded(false);
          onDone?.();
        },
      },
    );
  }

  function cancel() {
    setText("");
    if (!isReply) setExpanded(false);
    onDone?.();
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={cn(
          "flex h-11 w-full cursor-text items-center rounded-full border border-slate-300/70 bg-border px-5 text-left text-base text-slate-500 transition-colors outline-none hover:bg-slate-200/80 focus-visible:ring-[3px] focus-visible:ring-ring/40",
          className,
        )}
      >
        Start writing something
      </button>
    );
  }

  return (
    <form
      className={cn(
        "rounded-2xl border bg-white transition-shadow focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15",
        isReply ? "border-border p-2.5" : "border-border p-3 shadow-sm",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex gap-3">
        {user && !isReply && <UserAvatar user={user} className="mt-0.5 size-8 text-xs" />}
        <label className="sr-only" htmlFor={`composer-${parentCommentId ?? "root"}`}>
          {isReply ? `Reply to ${replyingTo ?? "comment"}` : "Write a comment"}
        </label>
        <textarea
          id={`composer-${parentCommentId ?? "root"}`}
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              cancel();
            }
          }}
          rows={isReply ? 2 : 3}
          placeholder={isReply ? `Reply to ${replyingTo ?? "this comment"}…` : "Ask a question or share your experience with this project…"}
          className={cn(
            "min-h-0 flex-1 resize-y bg-transparent leading-relaxed text-foreground outline-none placeholder:text-subtle-foreground",
            isReply ? "text-[13px]" : "text-[15px]",
          )}
          aria-invalid={tooLong}
        />
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        {text.length > MAX - 500 ? (
          <span className={cn("mr-auto text-xs", tooLong ? "font-semibold text-destructive" : "text-muted-foreground")}>
            {text.length}/{MAX}
          </span>
        ) : (
          !isReply && (
            <span className="mr-auto hidden text-xs text-subtle-foreground sm:inline">Ctrl/⌘ + Enter to post</span>
          )
        )}
        <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={create.isPending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!trimmed || tooLong || create.isPending} className="min-w-16">
          {create.isPending && <Loader2 className="animate-spin" />}
          {isReply ? "Reply" : "Post"}
        </Button>
      </div>
    </form>
  );
}
