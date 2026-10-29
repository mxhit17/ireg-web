"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowLeft, PencilLine, Trash2 } from "lucide-react";

import { BlogCard } from "@/components/blogs/blog-card";
import { BlogArticleContent } from "@/components/blogs/blog-content";
import { DeleteBlogDialog } from "@/components/blogs/delete-blog-dialog";
import { ShareButton } from "@/components/project-detail/share-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBlog, useBlogs } from "@/hooks/use-blogs";
import { isApiError } from "@/lib/api/errors";
import { isAdmin } from "@/lib/api/normalize";
import { readingTime } from "@/lib/format";

/** Figma "blog-view" (share in the app bar), plus "More blogs" below. */
export function BlogArticle({ slug }: { slug: string }) {
  const user = useCurrentUser();
  const admin = isAdmin(user);
  const router = useRouter();
  const blog = useBlog(slug);
  const all = useBlogs();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const more = (all.data ?? []).filter((b) => b.slug !== slug).slice(0, 3);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10">
      <div className="mx-auto grid w-full max-w-3xl min-w-0 grid-cols-1 gap-5">
        <Link
          href="/blogs"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary outline-none hover:underline focus-visible:underline"
        >
          <ArrowLeft className="size-4" /> All blogs
        </Link>

        {blog.isPending ? (
          <div className="grid gap-4">
            <Skeleton className="h-9 w-4/5 rounded-lg" />
            <Skeleton className="aspect-[2/1] rounded-2xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : blog.isError ? (
          <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <AlertCircle className="size-7 text-destructive" />
            <p className="font-bold">
              {isApiError(blog.error) && blog.error.status === 404 ? "Blog not found" : "Couldn't load this blog"}
            </p>
            <p className="text-sm text-muted-foreground">It may have been removed or renamed.</p>
            <Button asChild variant="outline">
              <Link href="/blogs">Back to blogs</Link>
            </Button>
          </Card>
        ) : (
          <>
            {admin && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-muted px-3 py-2 text-sm">
                <span className="font-semibold text-muted-foreground">Admin</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 /> Delete
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/blogs/manage/${blog.data.id}?slug=${encodeURIComponent(blog.data.slug)}`}>
                      <PencilLine /> Edit blog
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            <BlogArticleContent
              title={blog.data.title}
              excerpt={blog.data.excerpt}
              coverUrl={blog.data.coverImageUrl}
              sourceName={blog.data.sourceName}
              sourceUrl={blog.data.sourceUrl}
              date={blog.data.publishedAt ?? blog.data.createdAt}
              body={blog.data.body}
              actions={
                <ShareButton
                  title={blog.data.title}
                  label="Share this blog"
                  text={blog.data.excerpt ?? `${blog.data.title} — on IREG`}
                  className="size-9 px-0"
                />
              }
            />

            <footer className="flex items-center gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
              {blog.data.author?.name && (
                <>
                  <UserAvatar
                    user={{ name: blog.data.author.name, profile_image_url: blog.data.author.profileImageUrl }}
                    className="size-8 text-xs"
                  />
                  <span>
                    Posted by <span className="font-semibold text-foreground">{blog.data.author.name}</span>
                  </span>
                  <span aria-hidden>·</span>
                </>
              )}
              <span>{readingTime(blog.data.body)}</span>
            </footer>

            {admin && (
              <DeleteBlogDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                blog={blog.data}
                onDeleted={() => router.replace("/blogs")}
              />
            )}
          </>
        )}
      </div>

      {more.length > 0 && !blog.isError && (
        <section aria-labelledby="more-blogs" className="grid gap-4">
          <h2 id="more-blogs" className="text-lg font-bold">
            More from IREG
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((b) => (
              <li key={b.id}>
                <BlogCard blog={b} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
