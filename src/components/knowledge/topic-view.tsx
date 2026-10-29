"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, ChevronRight, PencilLine } from "lucide-react";

import { LevelBadge } from "@/components/knowledge/level-badge";
import { TopicContent } from "@/components/knowledge/topic-content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCategoryTopics, useKnowledgeTopic } from "@/hooks/use-knowledge";
import { isApiError } from "@/lib/api/errors";
import { isAdmin } from "@/lib/api/normalize";
import { cn } from "@/lib/utils";

/** Figma "knowledge-base-info-screen", with a "More in this category" rail on wide screens. */
export function TopicView({ categorySlug, topicSlug }: { categorySlug: string; topicSlug: string }) {
  const user = useCurrentUser();
  const admin = isAdmin(user);
  const topic = useKnowledgeTopic(topicSlug);
  // Prefer the topic's real category (search links may not know it).
  const catSlug = topic.data?.category?.slug ?? (categorySlug === "_" ? "" : categorySlug);
  const siblings = useCategoryTopics(catSlug);
  const list = catSlug ? (siblings.data?.topics ?? []) : [];
  const idx = list.findIndex((t) => t.slug === topicSlug);
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  const catName = topic.data?.category?.name ?? siblings.data?.category?.name ?? "";

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
        <Link href="/knowledge-base" className="shrink-0 font-semibold text-primary hover:underline">
          Knowledge Base
        </Link>
        {catSlug && (
          <>
            <ChevronRight className="size-4 shrink-0 text-subtle-foreground" />
            <Link href={`/knowledge-base/${catSlug}`} className="truncate font-semibold text-primary hover:underline">
              {catName || "…"}
            </Link>
          </>
        )}
        <ChevronRight className="size-4 shrink-0 text-subtle-foreground" />
        <span className="truncate text-muted-foreground">{topic.data?.title ?? "…"}</span>
      </nav>

      {topic.isPending ? (
        <div className="grid max-w-3xl gap-4">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-9 w-3/4 rounded-lg" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : topic.isError ? (
        <Card className="mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-12 text-center">
          <AlertCircle className="size-7 text-destructive" />
          <p className="font-bold">
            {isApiError(topic.error) && topic.error.status === 404 ? "Topic not found" : "Couldn't load this topic"}
          </p>
          <p className="text-sm text-muted-foreground">It may have been unpublished or renamed.</p>
          <Button asChild variant="outline">
            <Link href={catSlug ? `/knowledge-base/${catSlug}` : "/knowledge-base"}>Back</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid min-w-0 content-start gap-6">
            {admin && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-muted px-3 py-2 text-sm">
                <span className="font-semibold text-muted-foreground">Admin</span>
                <span className="text-subtle-foreground">·</span>
                <span className="text-muted-foreground">
                  {topic.data.status === "PUBLISHED" ? "Published" : topic.data.status.toLowerCase()}
                </span>
                <Button asChild size="sm" variant="outline" className="ml-auto">
                  <Link href={`/knowledge-base/manage/${topic.data.id}?slug=${encodeURIComponent(topic.data.slug)}`}>
                    <PencilLine /> Edit topic
                  </Link>
                </Button>
              </div>
            )}

            <TopicContent
              title={topic.data.title}
              level={topic.data.level}
              tags={topic.data.tags}
              categoryName={catName || null}
              definition={topic.data.definition}
              simpleExplanation={topic.data.simpleExplanation}
            />

            {(prev || next) && (
              <nav aria-label="More topics" className="grid gap-3 sm:grid-cols-2">
                {prev ? (
                  <PagerLink href={`/knowledge-base/${catSlug}/${prev.slug}`} label="Previous" title={prev.title} dir="prev" />
                ) : (
                  <span className="hidden sm:block" />
                )}
                {next && <PagerLink href={`/knowledge-base/${catSlug}/${next.slug}`} label="Next" title={next.title} dir="next" />}
              </nav>
            )}
          </div>

          {list.length > 1 && (
            <aside aria-label={`More in ${catName}`} className="hidden lg:block">
              <div className="sticky top-24 grid gap-2 rounded-2xl border border-border bg-white p-4">
                <p className="text-sm font-bold">More in {catName}</p>
                <ul className="-mx-2 grid max-h-[calc(100vh-12rem)] gap-0.5 overflow-y-auto">
                  {list.map((t) => {
                    const current = t.slug === topicSlug;
                    return (
                      <li key={t.id}>
                        <Link
                          href={`/knowledge-base/${catSlug}/${t.slug}`}
                          aria-current={current ? "page" : undefined}
                          className={cn(
                            "grid gap-1 rounded-lg px-2 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                            current ? "bg-accent font-semibold text-accent-foreground" : "text-slate-700 hover:bg-secondary",
                          )}
                        >
                          <span className="line-clamp-2">{t.title}</span>
                          <LevelBadge level={t.level} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function PagerLink({ href, label, title, dir }: { href: string; label: string; title: string; dir: "prev" | "next" }) {
  return (
    <Link
      href={href}
      className={cn(
        "group grid gap-0.5 rounded-xl border border-border bg-white p-4 outline-none hover:border-slate-300 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40",
        dir === "next" && "text-right sm:col-start-2",
      )}
    >
      <span className={cn("flex items-center gap-1 text-xs font-semibold text-muted-foreground", dir === "next" && "justify-end")}>
        {dir === "prev" && <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />}
        {label}
        {dir === "next" && <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />}
      </span>
      <span className="line-clamp-2 font-semibold">{title}</span>
    </Link>
  );
}
