"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ChevronRight, FileText, Plus } from "lucide-react";

import { CategoryIcon } from "@/components/knowledge/category-icon";
import { LevelBadge } from "@/components/knowledge/level-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCategoryTopics, useKnowledgeCategories } from "@/hooks/use-knowledge";
import { isApiError } from "@/lib/api/errors";
import { isAdmin } from "@/lib/api/normalize";
import { cn } from "@/lib/utils";
import { KNOWLEDGE_LEVELS, type KnowledgeLevel } from "@/types/knowledge";

/** Figma "knowledge-base-sublist": topic cards with level pill, title and a 2-line explanation. */
export function CategoryView({ slug }: { slug: string }) {
  const user = useCurrentUser();
  const admin = isAdmin(user);
  const data = useCategoryTopics(slug);
  // The categories list carries the description (the topics endpoint doesn't).
  const categories = useKnowledgeCategories();
  const description = categories.data?.find((c) => c.slug === slug)?.description ?? null;
  const [level, setLevel] = useState<KnowledgeLevel | "ALL">("ALL");

  const topics = data.data?.topics ?? [];
  const shown = level === "ALL" ? topics : topics.filter((t) => t.level === level);
  const name = data.data?.category?.name ?? "";

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        <Link href="/knowledge-base" className="font-semibold text-primary hover:underline">
          Knowledge Base
        </Link>
        <ChevronRight className="size-4 text-subtle-foreground" />
        <span className="truncate text-muted-foreground">{name || "…"}</span>
      </nav>

      {data.isPending ? (
        <>
          <Skeleton className="h-16 w-2/3 rounded-xl" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[92px] rounded-2xl" />
            ))}
          </div>
        </>
      ) : data.isError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <AlertCircle className="size-7 text-destructive" />
          <p className="font-bold">
            {isApiError(data.error) && data.error.status === 404 ? "Category not found" : "Couldn't load this category"}
          </p>
          <Button asChild variant="outline">
            <Link href="/knowledge-base">Back to Knowledge Base</Link>
          </Button>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <CategoryIcon name={name} slug={slug} />
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight">{name}</h1>
                {description && <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">{description}</p>}
                <p className="mt-1 text-sm text-subtle-foreground">
                  {topics.length} topic{topics.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            {admin && data.data.category && (
              <Button asChild>
                <Link href={`/knowledge-base/manage/new?category=${data.data.category.id}`}>
                  <Plus /> New topic here
                </Link>
              </Button>
            )}
          </div>

          {topics.length > 0 && (
            <div role="group" aria-label="Filter by level" className="flex flex-wrap gap-1.5">
              {[{ value: "ALL" as const, label: "All" }, ...KNOWLEDGE_LEVELS].map((l) => {
                const count = l.value === "ALL" ? topics.length : topics.filter((t) => t.level === l.value).length;
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLevel(l.value)}
                    aria-pressed={level === l.value}
                    disabled={count === 0}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      level === l.value
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white text-slate-600 hover:bg-secondary",
                    )}
                  >
                    {l.label} <span className="opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {topics.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <FileText className="size-7 text-subtle-foreground" />
              <p className="font-bold">No topics published yet</p>
              <p className="text-sm text-muted-foreground">Check back soon.</p>
            </Card>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {shown.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/knowledge-base/${slug}/${t.slug}`}
                    className="group grid h-full content-start gap-1.5 rounded-2xl border border-border bg-white p-4 outline-none transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  >
                    <LevelBadge level={t.level} />
                    <p className="font-bold leading-snug">{t.title}</p>
                    {t.simpleExplanation && <p className="line-clamp-2 text-[13px] text-slate-600">{t.simpleExplanation}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
