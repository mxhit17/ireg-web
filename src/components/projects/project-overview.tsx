"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowLeft, Building2, MapPin, Star } from "lucide-react";

import { DiscussionSection } from "@/components/project-detail/discussion-section";
import { RatingDialog } from "@/components/project-detail/rating-dialog";
import { RatingsPanel } from "@/components/project-detail/ratings-panel";
import { ShareButton } from "@/components/project-detail/share-button";
import { SaveButton } from "@/components/projects/project-card";
import { RatingStars } from "@/components/projects/rating-stars";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyRating, useRecordProjectView } from "@/hooks/use-project-detail";
import { useProject, useProjectRatings } from "@/hooks/use-projects";
import { isApiError } from "@/lib/api/errors";
import { formatPriceRange, formatProjectLocation, projectStatusLabel, projectTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Project page — web version of the Figma "project-view":
 * builder + name, location + stars, photo, Share / Rate, "Start writing something", DISCUSSIONS.
 * On desktop the rating breakdown and project facts sit in a sticky sidebar.
 */
export function ProjectOverview({ id }: { id: string }) {
  const project = useProject(id);
  const ratings = useProjectRatings(id);
  const mine = useMyRating(id);
  const [rateOpen, setRateOpen] = useState(false);
  useRecordProjectView(id);

  if (project.isPending) return <DetailSkeleton />;

  if (project.isError) {
    const notFound = isApiError(project.error) && (project.error.status === 404 || project.error.status === 400);
    return (
      <div className="mx-auto grid max-w-3xl gap-6">
        <BackLink />
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <p className="text-lg font-bold">{notFound ? "Project not found" : "Couldn't load this project"}</p>
          <p className="text-sm text-muted-foreground">
            {notFound ? "It may have been removed." : isApiError(project.error) ? project.error.message : "Please try again."}
          </p>
        </Card>
      </div>
    );
  }

  const p = project.data;
  const location = formatProjectLocation(p);
  const overall = ratings.data?.overall_rating ?? null;
  const rated = mine.data?.overall != null;

  return (
    // Mobile: hero → discussions → sidebar (Figma puts the comment box right under Share/Rate).
    // Desktop: sidebar spans both rows on the right.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-8">
      {/* ---- Hero: header, photo, actions ---- */}
      <div className="grid gap-4 lg:col-start-1 lg:row-start-1">
        <BackLink />

        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            {p.builderName && <p className="text-base text-foreground">{p.builderName}</p>}
            <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-[2rem]">{p.name}</h1>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            {location && (
              <p className="flex items-center gap-1 text-[13px] font-medium text-foreground">
                <MapPin className="size-3.5 text-primary" aria-hidden /> {location}
              </p>
            )}
            {ratings.isPending ? (
              <Skeleton className="h-4 w-28" />
            ) : overall !== null ? (
              <span className="flex items-center gap-1.5">
                <RatingStars value={overall} size={16} />
                <span className="text-sm font-bold">{overall.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({ratings.data?.total_ratings})</span>
              </span>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">Not rated yet</span>
            )}
          </div>
        </header>

        <div className="overflow-hidden rounded-xl bg-primary-soft">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.imageUrl}
              alt={p.name}
              className="aspect-[4/3] max-h-[560px] w-full object-cover sm:aspect-[16/9]"
            />
          ) : (
            <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 text-primary">
              <Building2 className="size-12" aria-hidden />
              <span className="text-sm font-medium text-accent-foreground">No photos yet</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[projectTypeLabel(p.type), projectStatusLabel(p.status)].filter(Boolean).map((c) => (
              <span key={c} className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-slate-600">
                {c}
              </span>
            ))}
            {formatPriceRange(p.minPrice, p.maxPrice) && (
              <span className="px-1 text-sm font-bold">{formatPriceRange(p.minPrice, p.maxPrice)}</span>
            )}
          </div>
          {/* Figma: share icon + "Rate" pill, grey #e2e8f0, 8px radius */}
          <div className="flex items-center gap-2">
            <SaveButton project={p} className="h-8 rounded-lg" />
            <ShareButton title={p.name} />
            <button
              type="button"
              onClick={() => setRateOpen(true)}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                rated ? "bg-amber-50 text-amber-800 hover:bg-amber-100" : "bg-border text-foreground hover:bg-slate-300",
              )}
            >
              {rated && <Star className="size-3.5 fill-star text-star" aria-hidden />}
              {rated ? `Rated ${mine.data!.overall!.toFixed(1)}` : "Rate"}
            </button>
          </div>
        </div>

        {p.description && <p className="text-[15px] leading-relaxed text-slate-700">{p.description}</p>}
      </div>

      {/* ---- Sidebar (desktop) / after discussions (mobile) ---- */}
      <aside className="order-last grid content-start gap-4 lg:sticky lg:top-24 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <RatingsPanel projectId={id} onRate={() => setRateOpen(true)} />
        <Card className="grid gap-3 p-5 text-sm">
          <p className="text-xs font-bold tracking-wider text-subtle-foreground uppercase">Project details</p>
          <Fact label="Builder" value={p.builderName} />
          <Fact label="Type" value={projectTypeLabel(p.type)} />
          <Fact label="Status" value={projectStatusLabel(p.status)} />
          <Fact label="Price" value={formatPriceRange(p.minPrice, p.maxPrice)} />
          <Fact
            label="Address"
            value={[p.location, p.locality, p.city, p.state].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ") || null}
          />
        </Card>
      </aside>

      {/* ---- Comment box + discussions ---- */}
      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <DiscussionSection projectId={id} />
      </div>

      <RatingDialog projectId={id} projectName={p.name} open={rateOpen} onOpenChange={setRateOpen} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
      <ArrowLeft className="size-4" /> Back to threads
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-8">
      <div className="grid gap-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
      <Skeleton className="hidden h-80 rounded-2xl lg:block" />
    </div>
  );
}
