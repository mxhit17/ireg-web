"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, Bookmark, ChevronRight, MapPin, Search, X } from "lucide-react";

import { ProjectThumb, SaveButton } from "@/components/projects/project-card";
import { RatingStars } from "@/components/projects/rating-stars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavedProjects } from "@/hooks/use-home";
import { useInView } from "@/hooks/use-in-view";
import { useProject, useProjectRatings } from "@/hooks/use-projects";
import { isApiError } from "@/lib/api/errors";
import { formatProjectLocation, projectTypeLabel, timeAgo } from "@/lib/format";
import type { SavedProject } from "@/types/project";

/**
 * Profile → Saved: GET user-and-admin-management/users/me/saved-projects (newest saves first).
 * Each tile opens the project page (discussions, rating). The saved-projects API returns only
 * name/type/description, so tiles lazily fetch GET projects/:id + ratings for photo, location and stars.
 */
export function SavedProjectsView() {
  const saved = useSavedProjects();
  const [filter, setFilter] = useState("");

  const items = useMemo(() => {
    const list = saved.data ?? [];
    const f = filter.trim().toLowerCase();
    return f ? list.filter((p) => `${p.name} ${p.description ?? ""}`.toLowerCase().includes(f)) : list;
  }, [saved.data, filter]);

  return (
    <section aria-labelledby="saved-title" className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="saved-title" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Bookmark className="size-6 fill-primary text-primary" aria-hidden />
            Saved
            {!!saved.data?.length && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-sm font-bold text-accent-foreground">
                {saved.data.length}
              </span>
            )}
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground">Projects you&apos;ve bookmarked to follow and compare.</p>
        </div>
        {(saved.data?.length ?? 0) > 4 && (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter saved projects"
              aria-label="Filter saved projects"
              className="h-10 w-full rounded-lg border border-input bg-white pr-9 pl-9 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
            />
            {filter && (
              <button
                type="button"
                onClick={() => setFilter("")}
                aria-label="Clear filter"
                className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-subtle-foreground hover:bg-secondary"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {saved.isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-2xl" />
          ))}
        </div>
      ) : saved.isError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <AlertCircle className="size-7 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {isApiError(saved.error) ? saved.error.message : "Couldn't load your saved projects."}
          </p>
          <Button variant="outline" onClick={() => saved.refetch()}>
            Try again
          </Button>
        </Card>
      ) : (saved.data?.length ?? 0) === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Bookmark className="size-6" aria-hidden />
          </span>
          <p className="text-lg font-bold">No saved projects yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Tap <span className="font-semibold text-foreground">Save</span> on any project to keep it here and come back to
            its discussions later.
          </p>
          <Button asChild className="mt-1">
            <Link href="/">Browse threads</Link>
          </Button>
        </Card>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-white px-5 py-8 text-center text-sm text-muted-foreground">
          No saved projects match “{filter}”.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((p) => (
            <li key={p.id}>
              <SavedProjectTile project={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SavedProjectTile({ project }: { project: SavedProject }) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "300px" });
  const detail = useProject(project.id, inView);
  const ratings = useProjectRatings(project.id, inView);
  const location = detail.data ? formatProjectLocation(detail.data) : null;
  const overall = ratings.data?.overall_rating ?? null;

  return (
    <div
      ref={ref}
      className="group relative flex h-full gap-4 rounded-2xl border border-border bg-white p-4 transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-md"
    >
      {detail.isPending ? (
        <Skeleton className="size-[72px] shrink-0 rounded-xl" />
      ) : (
        <ProjectThumb src={detail.data?.imageUrl ?? null} className="size-[72px] rounded-xl" />
      )}

      <div className="grid min-w-0 flex-1 content-start gap-0.5">
        {detail.data?.builderName && (
          <p className="truncate text-xs font-semibold text-muted-foreground">{detail.data.builderName}</p>
        )}
        {/* Stretched link: the whole tile opens the project page with its discussions. */}
        <Link
          href={`/projects/${project.id}`}
          className="line-clamp-2 leading-snug font-bold outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:underline"
        >
          {project.name}
        </Link>
        {location && (
          <p className="flex min-w-0 items-center gap-1 text-[13px] text-slate-600">
            <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{location}</span>
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle-foreground">
          {overall !== null ? (
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <RatingStars value={overall} size={12} />
              {overall.toFixed(1)}
            </span>
          ) : (
            ratings.isSuccess && <span>Not rated yet</span>
          )}
          {projectTypeLabel(project.type) && (
            <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold text-slate-600">
              {projectTypeLabel(project.type)}
            </span>
          )}
          {project.savedAt && <span>Saved {timeAgo(project.savedAt)}</span>}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-end justify-between">
        <SaveButton project={project} iconOnly />
        <ChevronRight className="pointer-events-none size-4 text-subtle-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
    </div>
  );
}
