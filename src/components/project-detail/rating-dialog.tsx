"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMyRating, useRateProject } from "@/hooks/use-project-detail";
import { cn } from "@/lib/utils";
import { RATING_CATEGORIES, type RatingCategoryCode } from "@/types/project";

type Scores = Partial<Record<RatingCategoryCode, number>>;

/**
 * Figma "Please rate the following:" sheet — 5 categories × 5 stars + Submit.
 * Uses the native <dialog> (focus trap, Esc to close, backdrop) — no extra dependency.
 * Pre-fills the user's previous scores from GET projects/:id/my-rating.
 */
export function RatingDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const myRating = useMyRating(projectId);
  const rate = useRateProject(projectId);
  const [scores, setScores] = useState<Scores>({});

  // Sync the native dialog with `open`.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Start from the saved rating each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const prev: Scores = {};
    for (const { code } of RATING_CATEGORIES) {
      const s = myRating.data?.scores[code];
      if (typeof s === "number") prev[code] = Math.round(s);
    }
    setScores(prev);
  }, [open, myRating.data]);

  const complete = RATING_CATEGORIES.every(({ code }) => typeof scores[code] === "number" && scores[code]! > 0);
  const isUpdate = myRating.data?.overall != null;

  function submit() {
    if (!complete) return;
    rate.mutate(scores as Record<RatingCategoryCode, number>, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="rate-title"
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === ref.current) onOpenChange(false); // backdrop click
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-subtle-foreground bg-[#fafbfc] p-0 text-foreground shadow-2xl backdrop:bg-slate-900/45 backdrop:backdrop-blur-[2px]"
    >
      <form
        method="dialog"
        className="grid gap-5 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="rate-title" className="text-lg font-bold">
              Please rate the following:
            </h2>
            <p className="text-sm text-muted-foreground">{projectName}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="-mt-1 -mr-1 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <X className="size-4" />
          </button>
        </div>

        {myRating.isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-3">
            {RATING_CATEGORIES.map(({ code, label }) => (
              <StarInput
                key={code}
                label={label}
                value={scores[code] ?? 0}
                onChange={(v) => setScores((s) => ({ ...s, [code]: v }))}
              />
            ))}
          </div>
        )}

        <div className="grid justify-items-center gap-2">
          <Button type="submit" size="lg" className="min-w-36 text-lg" disabled={!complete || rate.isPending}>
            {rate.isPending && <Loader2 className="animate-spin" />}
            {isUpdate ? "Update" : "Submit"}
          </Button>
          {!complete && <p className="text-xs text-muted-foreground">Rate all five to submit.</p>}
        </div>
      </form>
    </dialog>
  );
}

/** One row: label + 5 large stars, as a radio group (arrow keys change the value). */
function StarInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const id = label.replace(/\W+/g, "-").toLowerCase();

  return (
    <div className="grid gap-1">
      <span id={id} className="text-sm">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="flex justify-between"
        onMouseLeave={() => setHover(0)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(5, value + 1));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(1, value - 1));
          }
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="cursor-pointer rounded-md p-0.5 outline-none transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-star/50"
          >
            <Star
              className={cn("size-9 sm:size-10", n <= shown ? "fill-star text-star" : "text-star")}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
