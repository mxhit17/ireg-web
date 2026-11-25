"use client";

import { useEffect, useState } from "react";
import { MapPin, Star } from "lucide-react";

import { cn } from "@/lib/utils";

const PARAMS = ["Location & Connectivity", "Amenities & Facilities", "Surrounding & Environment", "Construction Quality", "Size and Layouts"];

/** Sample projects for the login/sign-up brand panel (illustrative, not live data). */
const CARDS = [
  { name: "Prestige Lakeside Habitat", place: "Whitefield, Bengaluru", overall: 4.6, scores: [4.8, 4.6, 4.4, 4.5, 4.7], thumb: "from-sky-300 via-sky-500 to-indigo-600" },
  { name: "Godrej Woods", place: "Sector 43, Noida", overall: 4.3, scores: [4.2, 4.5, 4.7, 4.1, 4.3], thumb: "from-emerald-300 via-teal-500 to-cyan-700" },
  { name: "Lodha Park", place: "Worli, Mumbai", overall: 4.5, scores: [4.9, 4.7, 4.2, 4.4, 4.5], thumb: "from-amber-300 via-orange-500 to-rose-600" },
];

const INTERVAL_MS = 3500;

/**
 * The project-card preview, now three cards sliding right → left on a loop. A copy of the first
 * card sits at the end so the loop always moves the same way; it snaps back invisibly. Pauses on
 * hover and stays still for people who prefer reduced motion.
 */
export function ProjectShowcase() {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setAnimate(true);
      setIndex((i) => i + 1);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused]);

  // After sliding onto the copy of card 1, jump back to the real card 1 without animating.
  function onTransitionEnd() {
    if (index >= CARDS.length) {
      setAnimate(false);
      setIndex(0);
    }
  }

  const slides = [...CARDS, CARDS[0]];
  const active = index % CARDS.length;

  return (
    <div className="mt-10 w-full max-w-md" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="-mx-4 overflow-hidden px-0 py-4">
        <div
          aria-hidden
          onTransitionEnd={onTransitionEnd}
          className={cn("flex", animate && "transition-transform duration-700 ease-in-out")}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((card, i) => (
            <div key={i} className="w-full shrink-0 px-4">
              <PreviewCard {...card} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-center gap-1.5" role="tablist" aria-label="Sample projects">
        {CARDS.map((c, i) => (
          <button
            key={c.name}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-label={`Show ${c.name}`}
            onClick={() => {
              setAnimate(true);
              setIndex(i);
            }}
            className={cn(
              "h-1.5 cursor-pointer rounded-full transition-all",
              active === i ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** A miniature of the project card from the Figma "threads-list" screen. */
function PreviewCard({ name, place, overall, scores, thumb }: (typeof CARDS)[number]) {
  return (
    <div className="w-full rounded-[18px] border border-white/20 bg-white text-foreground shadow-xl shadow-sky-950/30">
      <div className="flex items-start gap-3 p-4">
        <div className={cn("size-12 shrink-0 rounded-[10px] bg-gradient-to-br", thumb)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base leading-tight font-bold">{name}</p>
          <p className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 text-primary" /> {place}
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold">
          <Star className="size-4 fill-star text-star" /> {overall.toFixed(1)}
        </div>
      </div>
      <div className="space-y-2 rounded-b-[18px] border-t border-border bg-muted px-4 py-3.5">
        {PARAMS.map((label, i) => (
          <div key={label} className="flex items-center gap-3 text-xs">
            <span className="w-40 shrink-0 text-muted-foreground">{label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${(scores[i] / 5) * 100}%` }} />
            </span>
            <span className="w-6 text-right font-semibold">{scores[i].toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
