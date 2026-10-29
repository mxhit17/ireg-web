import Link from "next/link";

import { BlogCover } from "@/components/blogs/blog-content";
import { formatDate, readingTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Blog } from "@/types/blog";

/** First ~2 lines of the body when there's no excerpt. */
export function blogSummary(blog: Pick<Blog, "excerpt" | "body">) {
  return blog.excerpt ?? blog.body.replace(/\s+/g, " ").trim().slice(0, 220);
}

/**
 * Figma "blog-card": 160px photo, bold title, 2-line summary, "• 5 min read".
 * `featured` lays it out side by side on wide screens for the newest post.
 */
export function BlogCard({ blog, featured = false }: { blog: Blog; featured?: boolean }) {
  const date = formatDate(blog.publishedAt ?? blog.createdAt);
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition-[border-color,box-shadow] focus-within:ring-[3px] focus-within:ring-ring/40 hover:border-slate-300 hover:shadow-md",
        featured && "lg:grid lg:grid-cols-[1.25fr_1fr]",
      )}
    >
      <BlogCover
        src={blog.coverImageUrl}
        className={cn("h-40 w-full shrink-0 sm:h-48", featured && "sm:h-64 lg:h-full lg:min-h-[320px]")}
      />
      <div className={cn("flex flex-1 flex-col gap-2 p-4", featured && "lg:justify-center lg:gap-3 lg:p-8")}>
        {featured && <span className="text-xs font-bold tracking-wide text-primary uppercase">Latest</span>}
        <h2
          className={cn(
            "line-clamp-2 text-base leading-snug font-bold text-foreground",
            featured && "lg:line-clamp-3 lg:text-2xl lg:leading-tight",
          )}
        >
          <Link
            href={`/blogs/${blog.slug}`}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl group-hover:text-primary"
          >
            {blog.title}
          </Link>
        </h2>
        <p className={cn("line-clamp-2 text-[13px] leading-relaxed text-slate-600", featured && "lg:line-clamp-4 lg:text-[15px]")}>
          {blogSummary(blog)}
        </p>
        <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-subtle-foreground">
          {date && <span>{date}</span>}
          {date && <span aria-hidden className="size-[3px] rounded-full bg-current" />}
          <span>{readingTime(blog.body)}</span>
          {blog.sourceName && (
            <>
              <span aria-hidden className="size-[3px] rounded-full bg-current" />
              <span className="truncate">{blog.sourceName}</span>
            </>
          )}
        </p>
      </div>
    </article>
  );
}
