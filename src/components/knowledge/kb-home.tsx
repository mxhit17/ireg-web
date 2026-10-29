"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, ChevronRight, FilePen, FolderPlus, LibraryBig, Plus, Search, SearchX, X } from "lucide-react";

import { CategoryDialog } from "@/components/knowledge/category-dialog";
import { CategoryIcon } from "@/components/knowledge/category-icon";
import { LevelBadge } from "@/components/knowledge/level-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useKnowledgeCategories, useKnowledgeSearch, useLocalDrafts } from "@/hooks/use-knowledge";
import { isApiError } from "@/lib/api/errors";
import { isAdmin } from "@/lib/api/normalize";
import { timeAgo } from "@/lib/format";

/** Figma "knowledge-base-list": category cards (thumb, name, description) + search. */
export function KnowledgeBaseHome() {
  const user = useCurrentUser();
  const admin = isAdmin(user);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const [draft, setDraft] = useState(urlQ);
  const q = useDebouncedValue(draft.trim(), 300);
  const [catOpen, setCatOpen] = useState(false);

  // Keep ?q= in the URL (shareable, survives back/forward).
  useEffect(() => {
    if (q === urlQ.trim()) return;
    router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false });
  }, [q, urlQ, pathname, router]);

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">Knowledge Base</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Real estate terms and processes, explained in plain language.
          </p>
        </div>
        {admin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCatOpen(true)}>
              <FolderPlus /> New category
            </Button>
            <Button asChild>
              <Link href="/knowledge-base/manage/new">
                <Plus /> New topic
              </Link>
            </Button>
          </div>
        )}
      </div>

      <form role="search" className="relative max-w-3xl" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="kb-search" className="sr-only">
          Search the knowledge base
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-5 size-[18px] -translate-y-1/2 text-subtle-foreground" />
        <input
          id="kb-search"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search terms — “carpet area”, “khata”…"
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

      {q ? <SearchResults q={q} /> : <CategoryGrid admin={admin} onNewCategory={() => setCatOpen(true)} />}

      {admin && <CategoryDialog open={catOpen} onOpenChange={setCatOpen} />}
    </div>
  );
}

function CategoryGrid({ admin, onNewCategory }: { admin: boolean; onNewCategory: () => void }) {
  const categories = useKnowledgeCategories();

  if (categories.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (categories.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <AlertCircle className="size-7 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {isApiError(categories.error) ? categories.error.message : "Couldn't load the knowledge base."}
        </p>
        <Button variant="outline" onClick={() => categories.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  if (categories.data.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <LibraryBig className="size-8 text-subtle-foreground" />
        <p className="text-lg font-bold">Nothing here yet</p>
        <p className="text-sm text-muted-foreground">Guides will appear here once they&apos;re published.</p>
        {admin && (
          <Button onClick={onNewCategory} className="mt-1">
            <FolderPlus /> Create the first category
          </Button>
        )}
      </Card>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {categories.data.map((c) => (
        <li key={c.id}>
          <Link
            href={`/knowledge-base/${c.slug}`}
            className="group flex h-full gap-4 rounded-2xl border border-border bg-white p-4 outline-none transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <CategoryIcon name={c.name} slug={c.slug} />
            <div className="grid min-w-0 flex-1 content-start gap-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold leading-snug">{c.name}</h2>
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              {c.description && <p className="line-clamp-2 text-[13px] text-slate-600">{c.description}</p>}
              <p className="mt-1 text-xs text-subtle-foreground">
                {c.topics.length === 0
                  ? "No topics yet"
                  : `${c.topics.length} topic${c.topics.length === 1 ? "" : "s"} · ${c.topics
                      .slice(0, 3)
                      .map((t) => t.title)
                      .join(", ")}${c.topics.length > 3 ? "…" : ""}`}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SearchResults({ q }: { q: string }) {
  const results = useKnowledgeSearch(q);

  if (results.isPending) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (results.isError) {
    return <p className="text-sm text-destructive">{isApiError(results.error) ? results.error.message : "Search failed."}</p>;
  }
  if (results.data.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <SearchX className="size-7 text-subtle-foreground" />
        <p className="font-bold">No topics match “{q}”</p>
        <p className="text-sm text-muted-foreground">Try a shorter word or browse the categories.</p>
      </Card>
    );
  }

  return (
    <section aria-label="Search results" className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {results.data.length}
        {results.data.length === 20 ? "+" : ""} topic{results.data.length === 1 ? "" : "s"} for “{q}”
      </p>
      <ul className="grid gap-3">
        {results.data.map((t) => (
          <li key={t.id}>
            <Link
              href={`/knowledge-base/${t.category?.slug ?? "_"}/${t.slug}`}
              className="grid gap-1 rounded-2xl border border-border bg-white p-4 outline-none hover:border-slate-300 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <LevelBadge level={t.level} />
                {t.category && <span className="text-xs font-semibold text-muted-foreground">{t.category.name}</span>}
              </div>
              <p className="font-bold">{t.title}</p>
              <p className="line-clamp-2 text-[13px] text-slate-600">{t.simpleExplanation ?? t.definition}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Admin: drafts saved from this browser (there's no "list drafts" API yet). */
function DraftsPanel() {
  const drafts = useLocalDrafts();
  if (drafts.length === 0) return null;
  return (
    <Card className="grid grid-cols-1 gap-3 border-dashed p-4">
      <div className="flex items-center gap-2">
        <FilePen className="size-[18px] text-primary" />
        <p className="font-bold">Your drafts</p>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">{drafts.length}</span>
        <span className="ml-auto text-xs text-subtle-foreground">Saved in this browser · not visible to users</span>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {drafts.map((d) => (
          <li key={d.id}>
            <Link
              href={`/knowledge-base/manage/${d.id}`}
              className="flex items-center gap-3 rounded-xl bg-muted p-3 outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.category?.name ?? "Uncategorised"} · edited {timeAgo(d.updatedAt || d.createdAt)}
                </p>
              </div>
              <span className="text-xs font-semibold text-primary">Edit & publish</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
