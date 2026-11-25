"use client";

import { useState } from "react";
import { AlertCircle, Inbox, Loader2, MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { useAdminFeedback } from "@/hooks/use-feedback";
import { isApiError } from "@/lib/api/errors";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminFeedback, FeedbackFilters, FeedbackSummary } from "@/types/feedback";

type Bucket = "all" | "promoters" | "passives" | "detractors";

const BUCKETS: { value: Bucket; label: string; range?: [number, number] }[] = [
  { value: "all", label: "All" },
  { value: "promoters", label: "Promoters 9–10", range: [9, 10] },
  { value: "passives", label: "Passives 7–8", range: [7, 8] },
  { value: "detractors", label: "Detractors 1–6", range: [1, 6] },
];

/** Colour per NPS bucket, shared by the score chips and the distribution bars. */
function tone(rating: number) {
  if (rating >= 9) return { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" };
  if (rating >= 7) return { chip: "bg-amber-50 text-amber-800 border-amber-200", bar: "bg-amber-400" };
  return { chip: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-400" };
}

/** Admin → Feedback responses: GET admin/feedback (summary + filterable, paginated list). */
export function AdminFeedbackView() {
  const [bucket, setBucket] = useState<Bucket>("all");
  const [withMessage, setWithMessage] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  const range = BUCKETS.find((b) => b.value === bucket)?.range;
  const filters: FeedbackFilters = {
    sortBy,
    minRating: range?.[0],
    maxRating: range?.[1],
    hasMessage: withMessage ? true : undefined,
  };
  const query = useAdminFeedback(filters);

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Feedback responses</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          What people told us after &ldquo;How likely would you recommend us?&rdquo; — rated 1 to 10.
        </p>
      </div>

      {query.summary ? <SummaryCards summary={query.summary} /> : query.isPending && <Skeleton className="h-40 rounded-2xl" />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter by score" className="flex flex-wrap gap-1.5">
          {BUCKETS.map((b) => (
            <button
              key={b.value}
              type="button"
              aria-pressed={bucket === b.value}
              onClick={() => setBucket(b.value)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                bucket === b.value
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-slate-600 hover:bg-secondary",
              )}
            >
              {b.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={withMessage}
            onClick={() => setWithMessage((v) => !v)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
              withMessage ? "border-primary bg-primary-soft text-accent-foreground" : "border-border bg-white text-slate-600 hover:bg-secondary",
            )}
          >
            <MessageSquareText className="size-4" aria-hidden />
            With a message
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Sort
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
            className="h-9 cursor-pointer rounded-lg border border-border bg-white px-2 text-sm text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {query.isPending ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[92px] rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <AlertCircle className="size-6 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {isApiError(query.error) ? query.error.message : "Couldn't load feedback."}
          </p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Try again
          </Button>
        </Card>
      ) : query.items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <Inbox className="size-7 text-subtle-foreground" />
          <p className="font-bold">
            {bucket === "all" && !withMessage ? "No feedback yet" : "No feedback matches these filters"}
          </p>
        </Card>
      ) : (
        <div className={cn("grid grid-cols-1 gap-4", query.isPlaceholderData && "opacity-60")}>
          <p className="text-xs text-muted-foreground">
            Showing {query.items.length} of {query.total}
          </p>
          <ul className="grid grid-cols-1 gap-3">
            {query.items.map((f) => (
              <li key={f.id}>
                <FeedbackRow feedback={f} />
              </li>
            ))}
          </ul>
          {query.hasNextPage && (
            <Button
              variant="outline"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
              className="mx-auto"
            >
              {query.isFetchingNextPage && <Loader2 className="animate-spin" />}
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCards({ summary }: { summary: FeedbackSummary }) {
  const max = Math.max(1, ...Object.values(summary.distribution));
  const stats = [
    { label: "Responses", value: String(summary.totalResponses) },
    { label: "Average rating", value: summary.averageRating === null ? "—" : `${summary.averageRating.toFixed(1)}/10` },
    {
      label: "NPS",
      value: summary.npsScore === null ? "—" : `${summary.npsScore > 0 ? "+" : ""}${summary.npsScore}`,
      hint: `${summary.promoters} promoters · ${summary.passives} passives · ${summary.detractors} detractors`,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
        {stats.map((s) => (
          <Card key={s.label} className="px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{s.label}</p>
            <p className="mt-0.5 text-2xl font-extrabold tabular-nums">{s.value}</p>
            {s.hint && <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">{s.hint}</p>}
          </Card>
        ))}
      </div>
      <Card className="px-5 py-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Score distribution</p>
        <ul className="mt-3 flex h-40 items-end gap-1.5" aria-label="Responses per score">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => {
            const n = summary.distribution[r] ?? 0;
            return (
              <li key={r} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[11px] text-muted-foreground tabular-nums">{n || ""}</span>
                <span
                  className={cn("w-full rounded-t-[4px]", n ? tone(r).bar : "bg-secondary")}
                  style={{ height: `${Math.max(4, (n / max) * 100)}%` }}
                  title={`${r}/10: ${n} response${n === 1 ? "" : "s"}`}
                />
                <span className="text-xs font-bold text-slate-600 tabular-nums">{r}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function FeedbackRow({ feedback }: { feedback: AdminFeedback }) {
  const name = feedback.user?.name ?? "Deleted user";
  return (
    <Card className="flex gap-4 px-5 py-4">
      <span
        className={cn(
          "flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border leading-none font-extrabold tabular-nums",
          tone(feedback.rating).chip,
        )}
        aria-label={`Rated ${feedback.rating} out of 10`}
      >
        <span className="text-lg">{feedback.rating}</span>
        <span className="text-[10px] font-semibold opacity-70">/10</span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {feedback.user && (
            <UserAvatar
              user={{ name, profile_image_url: feedback.user.profileImageUrl }}
              className="size-6 text-[10px]"
            />
          )}
          <span className="font-bold">{name}</span>
          {feedback.user?.email && <span className="truncate text-sm text-muted-foreground">{feedback.user.email}</span>}
          <span className="ml-auto text-xs text-muted-foreground" title={formatDate(feedback.createdAt)}>
            {timeAgo(feedback.createdAt)}
          </span>
        </div>
        {feedback.message ? (
          <p className="mt-1.5 text-[15px] whitespace-pre-line text-slate-700">{feedback.message}</p>
        ) : (
          <p className="mt-1.5 text-sm text-subtle-foreground italic">No message — rating only.</p>
        )}
      </div>
    </Card>
  );
}
