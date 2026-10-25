"use client";

import Link from "next/link";
import { Bookmark, Building2, MapPin } from "lucide-react";
import { useState } from "react";

import { DiscussionPreview } from "@/components/projects/discussion-preview";
import { RatingStars } from "@/components/projects/rating-stars";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsSaved, useToggleSave } from "@/hooks/use-home";
import { useInView } from "@/hooks/use-in-view";
import { useProjectRatings, useTopDiscussions } from "@/hooks/use-projects";
import { formatPriceRange, formatProjectLocation, projectStatusLabel, projectTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectSummary } from "@/types/project";

/**
 * Web version of the Figma "thread-card": thumb + name + location + rating, the project's top
 * discussions, and a "View all discussions" footer. Rating and discussions load only once the card
 * is near the viewport, so a page of 12 cards doesn't fire 36 requests up front.
 */
export function ProjectCard({ project }: { project: ProjectSummary }) {
  const { ref, inView } = useInView<HTMLElement>({ rootMargin: "400px" });
  const ratings = useProjectRatings(project.id, inView);
  const discussions = useTopDiscussions(project.id, inView);

  const href = `/projects/${project.id}`;
  const location = formatProjectLocation(project);
  const price = formatPriceRange(project.minPrice, project.maxPrice);
  const chips = [projectTypeLabel(project.type), projectStatusLabel(project.status)].filter(Boolean) as string[];
  const total = discussions.data?.total ?? 0;

  return (
    <article
      ref={ref}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_4px_12px_rgba(15,23,42,0.02)] transition-[box-shadow,border-color] hover:border-slate-300 hover:shadow-md"
    >
      <header className="flex items-start gap-3 p-4">
        <ProjectThumb src={project.imageUrl} />

        <div className="min-w-0 flex-1">
          {project.builderName && (
            <p className="truncate text-xs font-semibold text-muted-foreground">{project.builderName}</p>
          )}
          <h3 className="line-clamp-2 text-base leading-snug font-bold text-foreground">
            {/* Stretched link: the whole header area is clickable. */}
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0 after:z-0 after:rounded-2xl focus-visible:underline"
            >
              {project.name}
            </Link>
          </h3>
          {location && (
            <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[13px] text-slate-600">
              <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{location}</span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
          {ratings.isPending && inView ? (
            <Skeleton className="h-4 w-24" />
          ) : ratings.data?.overall_rating != null ? (
            <>
              <span className="flex items-center gap-1">
                <RatingStars value={ratings.data.overall_rating} />
                <span className="text-[13px] font-bold">{ratings.data.overall_rating.toFixed(1)}</span>
              </span>
              <span className="text-[11px] text-subtle-foreground">
                {ratings.data.total_ratings} rating{ratings.data.total_ratings === 1 ? "" : "s"}
              </span>
            </>
          ) : ratings.isSuccess ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              Not rated yet
            </span>
          ) : null}
        </div>
      </header>

      {(chips.length > 0 || price) && (
        <div className="-mt-1 flex flex-wrap items-center gap-1.5 px-4 pb-3">
          {chips.map((c) => (
            <span key={c} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {c}
            </span>
          ))}
          {price && <span className="ml-auto text-[13px] font-bold text-foreground">{price}</span>}
        </div>
      )}

      <DiscussionPreview
        data={discussions.data}
        loading={!inView || discussions.isPending}
        error={discussions.isError}
      />

      <footer className="relative z-10 flex items-center justify-between gap-2 py-2 pr-2 pl-4">
        <Link
          href={href}
          className="rounded-md text-[13px] font-semibold text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          {discussions.isSuccess && total === 0
            ? "Start the discussion →"
            : total > 2
              ? `View all ${total} discussions →`
              : "View all discussions →"}
        </Link>
        <SaveButton project={project} />
      </footer>
    </article>
  );
}

export function SaveButton({
  project,
  iconOnly = false,
  className,
}: {
  project: Pick<ProjectSummary, "id" | "name" | "slug" | "type">;
  iconOnly?: boolean;
  className?: string;
}) {
  const saved = useIsSaved(project.id);
  const toggle = useToggleSave();
  return (
    <button
      type="button"
      onClick={() => toggle.mutate({ project, save: !saved })}
      disabled={toggle.isPending}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${project.name} from saved` : `Save ${project.name}`}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60",
        saved ? "bg-primary-soft text-accent-foreground hover:bg-sky-100" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        iconOnly && "w-8 justify-center px-0",
        className,
      )}
      title={iconOnly ? (saved ? "Saved — click to remove" : "Save") : undefined}
    >
      <Bookmark className={cn(iconOnly ? "size-[18px]" : "size-4", saved && "fill-current")} aria-hidden />
      {!iconOnly && (saved ? "Saved" : "Save")}
    </button>
  );
}

export function ProjectThumb({ src, className }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative size-14 shrink-0 overflow-hidden rounded-lg bg-primary-soft", className)}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex size-full items-center justify-center text-primary">
          <Building2 className="size-6" aria-hidden />
        </span>
      )}
    </div>
  );
}

export function ProjectCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-border bg-white", className)}>
      <div className="flex gap-3 p-4">
        <Skeleton className="size-14 rounded-lg" />
        <div className="grid flex-1 gap-2 py-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid gap-4 border-y border-border bg-[#fafbfc] p-4">
        <Skeleton className="h-3 w-28" />
        {[0, 1].map((i) => (
          <div key={i} className="grid gap-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        ))}
      </div>
      <div className="flex justify-center p-4">
        <Skeleton className="h-3.5 w-36" />
      </div>
    </div>
  );
}
