"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createBlog, deleteBlog, getBlog, getBlogs, publishBlog, updateBlog } from "@/lib/api/blogs";
import { isApiError } from "@/lib/api/errors";
import { blogDrafts } from "@/lib/blog-drafts";
import { prepareImageForUpload } from "@/lib/image";
import type { Blog, BlogInput } from "@/types/blog";

export const blogKeys = {
  all: ["blogs"] as const,
  list: ["blogs", "list"] as const,
  detail: (slug: string) => ["blogs", "detail", slug] as const,
};

const errMsg = (err: unknown, fallback: string) => (isApiError(err) ? err.message : fallback);
/** Covers are shown full-width on the article page — keep more pixels than avatars. */
const prepCover = (file: File | null) => (file ? prepareImageForUpload(file, { maxDimension: 1920 }) : Promise.resolve(null));

export function useBlogs() {
  return useQuery({ queryKey: blogKeys.list, queryFn: getBlogs, staleTime: 2 * 60 * 1000 });
}

export function useBlog(slug: string | null) {
  return useQuery({
    queryKey: blogKeys.detail(slug ?? ""),
    queryFn: () => getBlog(slug!),
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });
}

/** Drafts remembered in this browser (see lib/blog-drafts.ts). */
export function useBlogDrafts() {
  const [drafts, setDrafts] = useState<Blog[]>([]);
  useEffect(() => {
    setDrafts(blogDrafts.list());
    return blogDrafts.subscribe(() => setDrafts(blogDrafts.list()));
  }, []);
  return drafts;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

function afterWrite(qc: ReturnType<typeof useQueryClient>, blog: Blog | null, oldSlug?: string) {
  if (blog) blogDrafts.remember(blog);
  qc.invalidateQueries({ queryKey: blogKeys.all });
  if (oldSlug && blog && oldSlug !== blog.slug) qc.removeQueries({ queryKey: blogKeys.detail(oldSlug) });
}

export function useCreateBlog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, cover }: { input: BlogInput; cover: File | null }) => createBlog(input, await prepCover(cover)),
    onSuccess: (blog) => afterWrite(qc, blog),
    onError: (err) => toast.error(errMsg(err, "Couldn't save the blog.")),
  });
}

export function useUpdateBlog(id: string, oldSlug?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ changes, cover }: { changes: Partial<BlogInput>; cover: File | null }) =>
      updateBlog(id, changes, await prepCover(cover)),
    onSuccess: (blog) => afterWrite(qc, blog, oldSlug),
    onError: (err) => toast.error(errMsg(err, "Couldn't save your changes.")),
  });
}

export function usePublishBlog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishBlog(id),
    onSuccess: (blog, id) => {
      if (blog) blogDrafts.remember(blog);
      else blogDrafts.forget(id);
      qc.invalidateQueries({ queryKey: blogKeys.all });
      toast.success("Blog published — it's now visible to everyone");
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't publish the blog.")),
  });
}

export function useDeleteBlog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (blog: Pick<Blog, "id" | "slug">) => deleteBlog(blog.id),
    onSuccess: (_, blog) => {
      blogDrafts.forget(blog.id);
      qc.setQueryData<Blog[]>(blogKeys.list, (list) => list?.filter((b) => b.id !== blog.id));
      qc.removeQueries({ queryKey: blogKeys.detail(blog.slug) });
      qc.invalidateQueries({ queryKey: blogKeys.list });
      toast.success("Blog deleted");
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't delete the blog.")),
  });
}
