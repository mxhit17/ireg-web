"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Building2, Flame, Loader2, Sparkles } from "lucide-react";

import { AdminRequestsBanner } from "@/components/home/admin-requests-banner";
import { CreateProjectFab } from "@/components/home/create-project-fab";
import { SavedRail } from "@/components/home/saved-rail";
import { ProjectCard, ProjectCardSkeleton } from "@/components/projects/project-card";
import { FeedState, ProjectGrid, ProjectSearchResults } from "@/components/projects/project-feed";
import { ProjectSearchBar } from "@/components/projects/project-search-bar";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";
import { HOME_PAGE_SIZE, useHome } from "@/hooks/use-home";
import { isApiError } from "@/lib/api/errors";
import type { ProjectSummary } from "@/types/project";

/**
 * Home = the "Threads & Search" tab. One call to GET home gives the Recently added and Popular
 * sections (saved projects excluded from both); saved projects sit in a rail above them.
 * A `?q=` in the URL swaps the sections for search results.
 */
export function HomeView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const user = useCurrentUser();
  const q = params.get("q")?.trim() ?? "";

  function setQuery(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set("q", next);
    else sp.delete("q");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">
            {q ? (
              <>Results for &ldquo;{q}&rdquo;</>
            ) : (
              <>Hi{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</>
            )}
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {q
              ? "Matching project names, localities, cities and states."
              : "Discover, discuss and rate real estate projects across India."}
          </p>
        </div>
        <ProjectSearchBar value={q} onSearch={setQuery} className="max-w-3xl" />
        {!q && <AdminRequestsBanner />}
      </section>

      {q ? <ProjectSearchResults q={q} onClear={() => setQuery("")} /> : <HomeSections />}

      {/* Room so the floating button never covers the last card's footer. */}
      <div aria-hidden className="h-12" />
      <CreateProjectFab />
    </div>
  );
}

function HomeSections() {
  const home = useHome();
  const pages = home.data?.pages ?? [];
  const last = pages.at(-1);

  // Popular page N only excludes recent page N, so de-duplicate across everything loaded.
  const recent = uniqueById(pages.flatMap((p) => p.recent));
  const recentIds = new Set(recent.map((p) => p.id));
  const popular = uniqueById(pages.flatMap((p) => p.popular)).filter((p) => !recentIds.has(p.id));

  return (
    <>
      <SavedRail />

      {home.isPending ? (
        <>
          <SectionSkeleton />
          <SectionSkeleton />
        </>
      ) : home.isError && pages.length === 0 ? (
        <FeedState
          icon={<AlertCircle className="size-8 text-destructive" />}
          title="We couldn't load your home feed"
          body={isApiError(home.error) ? home.error.message : "Please check your connection and try again."}
          action={
            <Button onClick={() => home.refetch()} disabled={home.isFetching}>
              {home.isFetching && <Loader2 className="animate-spin" />}
              Try again
            </Button>
          }
        />
      ) : recent.length === 0 && popular.length === 0 ? (
        <FeedState
          icon={<Building2 className="size-8 text-subtle-foreground" />}
          title="No projects yet"
          body="Projects added to IREG will show up here. You can also search for one above."
        />
      ) : (
        <>
          <HomeSection
            id="recent"
            icon={<Sparkles className="size-5 text-primary" aria-hidden />}
            title="Recently added"
            subtitle="The newest projects on IREG"
            total={last?.pagination.recent.total}
            projects={recent}
            hasMore={!!last?.pagination.recent.hasNextPage}
            loadingMore={home.isFetchingNextPage}
            onMore={() => home.fetchNextPage()}
          />
          <HomeSection
            id="popular"
            icon={<Flame className="size-5 text-orange-500" aria-hidden />}
            title="Popular"
            subtitle="Most viewed, saved and discussed this month"
            total={last?.pagination.popular.total}
            projects={popular}
            hasMore={!!last?.pagination.popular.hasNextPage}
            loadingMore={home.isFetchingNextPage}
            onMore={() => home.fetchNextPage()}
            emptyText="Popularity is recalculated every 30 minutes from views, saves, comments and ratings — check back soon."
          />
        </>
      )}
    </>
  );
}

function HomeSection({
  id,
  icon,
  title,
  subtitle,
  total,
  projects,
  hasMore,
  loadingMore,
  onMore,
  emptyText,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  total?: number;
  projects: ProjectSummary[];
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
  emptyText?: string;
}) {
  if (projects.length === 0 && !emptyText) return null;

  return (
    <section aria-labelledby={`${id}-heading`} className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id={`${id}-heading`} className="flex items-center gap-2 text-lg font-bold">
            {icon}
            {title}
            {!!total && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">
                {total}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-white px-5 py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ProjectGrid>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
          {loadingMore && hasMore && <ProjectCardSkeleton />}
        </ProjectGrid>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onMore} disabled={loadingMore}>
            {loadingMore && <Loader2 className="animate-spin" />}
            Show more {title.toLowerCase()} projects
          </Button>
        </div>
      )}
    </section>
  );
}

function SectionSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="h-6 w-44 animate-pulse rounded-md bg-slate-200/70" />
      <ProjectGrid>
        {Array.from({ length: Math.min(HOME_PAGE_SIZE, 3) }, (_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </ProjectGrid>
    </div>
  );
}

function uniqueById(list: ProjectSummary[]) {
  const seen = new Set<string>();
  return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}
