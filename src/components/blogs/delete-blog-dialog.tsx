"use client";

import { useEffect, useRef } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDeleteBlog } from "@/hooks/use-blogs";
import type { Blog } from "@/types/blog";

/** Admin: confirm, then DELETE admin/blogs/:id (soft delete — users stop seeing it immediately). */
export function DeleteBlogDialog({
  open,
  onOpenChange,
  blog,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blog: Pick<Blog, "id" | "slug" | "title" | "status">;
  onDeleted?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const del = useDeleteBlog();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      del.reset();
      d.showModal();
    }
    if (!open && d.open) d.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    if (!del.isPending) onOpenChange(false);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="del-blog-title"
      aria-describedby="del-blog-desc"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-white p-0 text-foreground shadow-2xl backdrop:bg-slate-900/45"
    >
      <div className="grid gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-destructive">
            <Trash2 className="size-5" />
          </span>
          <div className="grid gap-1">
            <h2 id="del-blog-title" className="text-lg font-bold">
              Delete this blog?
            </h2>
            <p id="del-blog-desc" className="text-sm text-muted-foreground">
              “{blog.title}”{" "}
              {blog.status === "PUBLISHED" ? "will be removed for everyone right away." : "will be removed."} Its cover photo
              is deleted too. This can&apos;t be undone from the app.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close} disabled={del.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={del.isPending}
            onClick={() =>
              del.mutate(blog, {
                onSuccess: () => {
                  onOpenChange(false);
                  onDeleted?.();
                },
              })
            }
          >
            {del.isPending && <Loader2 className="animate-spin" />}
            Delete blog
          </Button>
        </div>
      </div>
    </dialog>
  );
}
