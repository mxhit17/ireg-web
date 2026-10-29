"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, FilePen, Newspaper, Plus, Search, SearchX, X } from "lucide-react";

import { BlogCard } from "@/components/blogs/blog-card";
import { BlogCover } from "@/components/blogs/blog-content";
import { CreateFab } from "@/components/home/create-project-fab";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBlogDrafts, useBlogs } from "@/hooks/use-blogs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { isApiError } from "@/lib/api/errors";
import { isAdmin } from "@/lib/api/normalize";
import { timeAgo } from "@/lib/format";
import type { Blog } from "@/types/blog";

/** Figma "blog-list": cover cards, search in the app bar, admin "Create Blog" FAB. */
export function BlogsHome() {
  const user = useCurrentUser();
  const admin = isAdmin(user);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const [draft, setDraft] = useState(urlQ);
  const q = useDebouncedValue(draft.trim(), 200);
  const blogs = useBlogs();

  useEffect(() => {
    if (q === urlQ.trim()) return;
    router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false });
  }, [q, urlQ, pathname, router]);

  // The API returns every published blog in one list, so search is done here.
  const shown = useMemo(() => {
    const list = blogs.data ?? [];
    if (!q) return list;
    const terms = q.toLowerCase().split(/\s+/);
    return list.filter((b) => {
      const hay = `${b.title} ${b.excerpt ?? ""} ${b.sourceName ?? ""} ${b.body}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [blogs.data, q]);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">Blogs</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">Real estate news and analysis, curated by the IREG team.</p>
        </div>
        {admin && (
          <Button asChild className="max-sm:hidden">
            <Link href="/blogs/manage/new">
              <Plus /> Create blog
            </Link>
          </Button>
        )}
      </div>

      <form role="search" className="relative max-w-2xl" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="blog-search" className="sr-only">
          Search blogs
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-5 size-[18px] -translate-y-1/2 text-subtle-foreground" />
        <input
          id="blog-search"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search news — “RERA”, “Gurugram”…"
          autoComplete="off"
          className="h-[52px] w-full rounded-[18px] border border-border bg-white pr-12 pl-12 text-base font-semibold shadow-[0_4px_12px_rgba(15,23,42,0.03)] outline-none placeholder:font-semibold placeholder:text-black/25 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {draft && (
          <button
            type="button"
            onClick={() => setDraft("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-subtle-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {admin && !q && <DraftsPanel />}

      {blogs.isPending ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[300px] rounded-2xl sm:col-span-2 lg:col-span-3 lg:h-[320px]" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[300px] rounded-2xl" />
          ))}
        </div>
      ) : blogs.isError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <AlertCircle className="size-7 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {isApiError(blogs.error) ? blogs.error.message : "Couldn't load blogs."}
          </p>
          <Button variant="outline" onClick={() => blogs.refetch()}>
            Try again
          </Button>
        </Card>
      ) : shown.length === 0 ? (
        q ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <SearchX className="size-7 text-subtle-foreground" />
            <p className="font-bold">No blogs match “{q}”</p>
            <p className="text-sm text-muted-foreground">Try a different word.</p>
          </Card>
        ) : (
          <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <Newspaper className="size-8 text-subtle-foreground" />
            <p className="text-lg font-bold">No blogs yet</p>
            <p className="text-sm text-muted-foreground">News and analysis will appear here once it&apos;s published.</p>
            {admin && (
              <Button asChild className="mt-1">
                <Link href="/blogs/manage/new">
                  <Plus /> Write the first blog
                </Link>
              </Button>
            )}
          </Card>
        )
      ) : (
        <BlogGrid blogs={shown} featureFirst={!q} q={q} />
      )}

      {admin && <CreateFab href="/blogs/manage/new" label="Create Blog" className="sm:hidden" />}
    </div>
  );
}

function BlogGrid({ blogs, featureFirst, q }: { blogs: Blog[]; featureFirst: boolean; q: string }) {
  const [first, ...rest] = blogs;
  return (
    <section aria-label={q ? "Search results" : "Latest blogs"} className="grid gap-4">
      {q && (
        <p className="text-sm text-muted-foreground">
          {blogs.length} blog{blogs.length === 1 ? "" : "s"} for “{q}”
        </p>
      )}
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featureFirst && first && (
          <li className="sm:col-span-2 lg:col-span-3">
            <BlogCard blog={first} featured />
          </li>
        )}
        {(featureFirst ? rest : blogs).map((b) => (
          <li key={b.id}>
            <BlogCard blog={b} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Admin: drafts saved from this browser (there's no "list drafts" API yet). */
function DraftsPanel() {
  const drafts = useBlogDrafts();
  if (drafts.length === 0) return null;
  return (
    <Card className="grid grid-cols-1 gap-3 border-dashed p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilePen className="size-[18px] text-primary" />
        <p className="font-bold">Your drafts</p>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">{drafts.length}</span>
        <span className="ml-auto text-xs text-subtle-foreground">Saved in this browser · not visible to users</span>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {drafts.map((d) => (
          <li key={d.id}>
            <Link
              href={`/blogs/manage/${d.id}`}
              className="flex items-center gap-3 rounded-xl bg-muted p-2.5 outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <BlogCover src={d.coverImageUrl} className="size-12 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.title}</p>
                <p className="truncate text-xs text-muted-foreground">Edited {timeAgo(d.updatedAt || d.createdAt)}</p>
              </div>
              <span className="text-xs font-semibold text-primary">Edit & publish</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
