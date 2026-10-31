"use client";

import Link from "next/link";
import { Bookmark, MapPin } from "lucide-react";

import { ProjectThumb, SaveButton } from "@/components/projects/project-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavedProjects } from "@/hooks/use-home";
import { useInView } from "@/hooks/use-in-view";
import { useProject } from "@/hooks/use-projects";
import { formatProjectLocation, timeAgo } from "@/lib/format";
import type { SavedProject } from "@/types/project";

/**
 * "Your saved projects" — a horizontal rail at the top of home. The saved-projects API returns
 * only name/type/saved_at, so each tile lazily loads GET projects/:id for its photo and location
 * (that response is cached and reused by the project page).
 */
export function SavedRail() {
  const saved = useSavedProjects();

  // isLoading (not isPending): the query is disabled for signed-out visitors and never "loads".
  if (saved.isLoading) {
    return (
      <section className="grid gap-3">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[92px] w-72 shrink-0 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }
  // Nothing saved (or the list failed): skip the section rather than show an empty band.
  if (!saved.data || saved.data.length === 0) return null;

  return (
    <section aria-labelledby="saved-heading" className="grid gap-3">
      <div className="flex items-end justify-between gap-4">
        <h2 id="saved-heading" className="flex items-center gap-2 text-lg font-bold">
          <Bookmark className="size-5 fill-primary text-primary" aria-hidden />
          Your saved projects
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-accent-foreground">
            {saved.data.length}
          </span>
        </h2>
        <Link href="/profile/saved" className="text-sm font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>
      <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:thin]">
        {saved.data.map((p) => (
          <li key={p.id} className="w-72 shrink-0 snap-start">
            <SavedTile project={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SavedTile({ project }: { project: SavedProject }) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "200px" });
  const detail = useProject(project.id, inView);
  const location = detail.data ? formatProjectLocation(detail.data) : null;
  const meta = project.savedAt ? `Saved ${timeAgo(project.savedAt)}` : "";

  return (
    <div
      ref={ref}
      className="group relative flex h-full items-center gap-3 rounded-2xl border border-border bg-white p-3 transition-[box-shadow,border-color] hover:border-slate-300 hover:shadow-md"
    >
      {detail.isPending ? (
        <Skeleton className="size-14 shrink-0 rounded-lg" />
      ) : (
        <ProjectThumb src={detail.data?.imageUrl ?? null} />
      )}
      <div className="min-w-0 flex-1">
        <Link
          href={`/projects/${project.id}`}
          className="line-clamp-1 text-[15px] font-bold outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:underline"
        >
          {project.name}
        </Link>
        <p className="flex min-w-0 items-center gap-1 text-[13px] text-slate-600">
          {location ? (
            <>
              <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{location}</span>
            </>
          ) : (
            <span className="truncate">{detail.data?.builderName ?? " "}</span>
          )}
        </p>
        {meta && <p className="truncate text-xs text-subtle-foreground">{meta}</p>}
      </div>
      <SaveButton project={project} iconOnly className="relative z-10 self-start" />
    </div>
  );
}
