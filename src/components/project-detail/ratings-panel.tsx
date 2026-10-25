"use client";

import { Star } from "lucide-react";

import { RatingStars } from "@/components/projects/rating-stars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyRating } from "@/hooks/use-project-detail";
import { useProjectRatings } from "@/hooks/use-projects";
import { RATING_CATEGORIES } from "@/types/project";

/**
 * Web addition: the community rating broken down by the 5 parameters, plus the user's own rating.
 * (The mobile design shows only the overall stars; there's room for the detail on desktop.)
 */
export function RatingsPanel({ projectId, onRate }: { projectId: string; onRate: () => void }) {
  const ratings = useProjectRatings(projectId);
  const mine = useMyRating(projectId);
  const byCode = new Map(ratings.data?.categories.map((c) => [c.code, c]) ?? []);
  const overall = ratings.data?.overall_rating ?? null;

  return (
    <Card className="grid gap-5 p-5">
      <div>
        <p className="text-xs font-bold tracking-wider text-subtle-foreground uppercase">Community rating</p>
        {ratings.isPending ? (
          <Skeleton className="mt-2 h-10 w-40" />
        ) : (
          <div className="mt-1 flex items-end gap-3">
            <span className="text-4xl leading-none font-extrabold">{overall !== null ? overall.toFixed(1) : "–"}</span>
            <div className="pb-0.5">
              <RatingStars value={overall} size={16} />
              <p className="text-xs text-muted-foreground">
                {ratings.data?.total_ratings
                  ? `${ratings.data.total_ratings} rating${ratings.data.total_ratings === 1 ? "" : "s"}`
                  : "No ratings yet"}
              </p>
            </div>
          </div>
        )}
      </div>

      <ul className="grid gap-3">
        {RATING_CATEGORIES.map(({ code, label }) => {
          const avg = byCode.get(code)?.average_rating ?? null;
          const my = mine.data?.scores[code] ?? null;
          return (
            <li key={code} className="grid gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="flex items-center gap-2">
                  {my !== null && (
                    <span className="text-[11px] font-semibold text-accent-foreground" title="Your rating">
                      You: {my}
                    </span>
                  )}
                  <span className="w-7 text-right font-semibold">{avg !== null ? avg.toFixed(1) : "–"}</span>
                </span>
              </div>
              <span className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <span
                  className="block h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${((avg ?? 0) / 5) * 100}%` }}
                />
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3">
        <div className="text-sm">
          {mine.data?.overall != null ? (
            <>
              <p className="font-semibold">Your rating: {mine.data.overall.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">You can update it anytime.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">Been here or bought here?</p>
              <p className="text-xs text-muted-foreground">Help other buyers decide.</p>
            </>
          )}
        </div>
        <Button size="sm" onClick={onRate} className="shrink-0">
          <Star className="size-4 fill-current" />
          {mine.data?.overall != null ? "Edit" : "Rate"}
        </Button>
      </div>
    </Card>
  );
}
