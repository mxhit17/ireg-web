"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, Eye, Flame, MapPin, MessageSquare, Pause, Play, Star } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useProjectRatings, useTopPopularProjects } from "@/hooks/use-projects";
import { formatCount, formatProjectLocation } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectSummary } from "@/types/project";

/** Seconds each card takes to drift past — the strip's speed scales with how many there are. */
const SECONDS_PER_CARD = 7;

const FALLBACKS = [
  "from-sky-400 via-sky-600 to-indigo-800",
  "from-emerald-400 via-teal-600 to-cyan-800",
  "from-amber-400 via-orange-500 to-rose-700",
  "from-violet-400 via-purple-600 to-indigo-900",
  "from-rose-400 via-pink-600 to-fuchsia-800",
];

/**
 * Home hero: the 10 most popular projects as large photo cards drifting left → right on a loop.
 * Hover (or keyboard focus) pauses it, there's a pause button, and it doesn't move at all for
 * people who prefer reduced motion (they can scroll it sideways instead).
 */
export function TopPopular() {
  const top = useTopPopularProjects(10);
  const [paused, setPaused] = useState(false);
  const items = top.data ?? [];

  if (top.isError || (top.isSuccess && items.length === 0)) return null;

  return (
    <section
      aria-labelledby="top10-heading"
      className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 py-6 text-white shadow-[0_20px_50px_-20px_rgba(2,132,199,0.55)] sm:py-7"
    >
      {/* soft decorative glow */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 -z-10 size-72 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 -z-10 size-80 rounded-full bg-indigo-400/25 blur-3xl" />

      <div className="flex items-start justify-between gap-3 px-5 sm:px-7">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase ring-1 ring-white/20">
            <Flame className="size-3.5 text-amber-300" aria-hidden /> Trending this month
          </p>
          {/* <h2 id="top10-heading" className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
            Top 10 popular projects
          </h2> */}
          <p className="text-sm text-sky-100 leading-loose">Most viewed, saved and discussed on IREG right now.</p>
        </div>
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? "Play the strip" : "Pause the strip"}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 transition-colors outline-none hover:bg-white/25 focus-visible:ring-[3px] focus-visible:ring-white/60 motion-reduce:hidden"
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
        )}
      </div>

      <div className="mt-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)] motion-reduce:overflow-x-auto">
        {top.isPending ? (
          <div className="flex gap-4 px-5 sm:px-7">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[230px] w-[280px] shrink-0 rounded-3xl bg-white/15 sm:w-[320px]" />
            ))}
          </div>
        ) : (
          <ul
            className={cn(
              "flex w-max animate-marquee-left motion-reduce:animate-none hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]",
              paused && "[animation-play-state:paused]",
            )}
            style={{ "--marquee-duration": `${Math.max(items.length, 4) * SECONDS_PER_CARD}s` } as React.CSSProperties}
          >
            {/* Two copies for a seamless loop; the second is decorative only. */}
            {[0, 1].flatMap((copy) =>
              items.map((p, i) => (
                <li key={`${copy}-${p.id}`} aria-hidden={copy === 1} className={cn("shrink-0 pr-4", copy === 1 && "motion-reduce:hidden")}>
                  <TopCard project={p} rank={i + 1} focusable={copy === 0} />
                </li>
              )),
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

function TopCard({ project: p, rank, focusable }: { project: ProjectSummary; rank: number; focusable: boolean }) {
  const ratings = useProjectRatings(p.id);
  const [failed, setFailed] = useState(false);
  const overall = ratings.data?.overall_rating ?? null;
  const location = formatProjectLocation(p);

  return (
    <Link
      href={`/projects/${p.id}`}
      tabIndex={focusable ? undefined : -1}
      className="group relative flex h-[230px] w-[280px] flex-col justify-end overflow-hidden rounded-3xl bg-slate-900 shadow-lg ring-1 ring-white/15 outline-none focus-visible:ring-[3px] focus-visible:ring-white sm:w-[320px]"
    >
      {p.imageUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.imageUrl}
          alt=""
          loading={rank <= 4 ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div aria-hidden className={cn("absolute inset-0 bg-gradient-to-br", FALLBACKS[(rank - 1) % FALLBACKS.length])} />
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />

      {/* rank */}
      <span className="absolute top-3 left-3 flex items-baseline gap-0.5 rounded-2xl bg-white/95 px-2.5 py-1 font-extrabold text-slate-900 shadow-md">
        <span className="text-xs text-primary">#</span>
        <span className="text-lg leading-none">{rank}</span>
      </span>
      {/* rating */}
      {overall !== null && (
        <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-slate-950/55 px-2.5 py-1 text-sm font-bold backdrop-blur-sm">
          <Star className="size-3.5 fill-star text-star" aria-hidden /> {overall.toFixed(1)}
        </span>
      )}

      <div className="relative grid gap-1 p-4 text-white">
        {p.builderName && <p className="truncate text-[11px] font-semibold tracking-wider text-sky-200 uppercase">{p.builderName}</p>}
        <p className="line-clamp-2 text-lg leading-snug font-extrabold">{p.name}</p>
        {location && (
          <p className="flex min-w-0 items-center gap-1 text-[13px] text-slate-200">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{location}</span>
          </p>
        )}
        {p.stats && (
          <p className="mt-1 flex items-center gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1" title="Views in the last 30 days">
              <Eye className="size-3.5" aria-hidden /> {formatCount(p.stats.views30d)}
            </span>
            <span className="flex items-center gap-1" title="Saves in the last 30 days">
              <Bookmark className="size-3.5" aria-hidden /> {formatCount(p.stats.saves30d)}
            </span>
            <span className="flex items-center gap-1" title="Comments in the last 30 days">
              <MessageSquare className="size-3.5" aria-hidden /> {formatCount(p.stats.comments30d)}
            </span>
          </p>
        )}
      </div>
    </Link>
  );
}
