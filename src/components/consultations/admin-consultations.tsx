"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ChevronRight, Inbox, Loader2, MessageSquare } from "lucide-react";

import { AssignExpert } from "@/components/consultations/admin-actions";
import { ServiceIcon, StatusBadge } from "@/components/consultations/consultation-bits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConsultationList } from "@/hooks/use-consultations";
import { isApiError } from "@/lib/api/errors";
import { formatPrice } from "@/lib/consultation-status";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Consultation, ConsultationStatus } from "@/types/consultation";

type Tab = "active" | "completed";
type Filter = "ALL" | ConsultationStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PAID", label: "Needs an expert" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "ONGOING", label: "Ongoing" },
];

/**
 * Admin queue. "In progress" = GET admin/consultations (paid, not completed: PAID / ASSIGNED /
 * ONGOING) — unassigned ones can be assigned right from the list. "Completed" =
 * GET admin/consultations/completed.
 */
export function AdminConsultations() {
  const [tab, setTab] = useState<Tab>("active");
  const active = useConsultationList("admin-active");
  const completed = useConsultationList("admin-completed");

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Manage consultations</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Assign an expert as soon as a booking is paid — clients expect a reply within 24–48 hours.
        </p>
      </div>

      <div role="tablist" aria-label="Consultations" className="flex gap-1 border-b border-border">
        {(
          [
            ["active", "In progress", active],
            ["completed", "Completed", completed],
          ] as const
        ).map(([key, label, q]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {q.isSuccess && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-2 py-0.5 text-xs",
                  tab === key ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground",
                )}
              >
                {q.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "active" ? <ActiveList query={active} /> : <CompletedList query={completed} />}
    </div>
  );
}

type ListQuery = ReturnType<typeof useConsultationList>;

function ActiveList({ query }: { query: ListQuery }) {
  const needs = query.items.filter((c) => c.status === "PAID").length;
  const [filter, setFilter] = useState<Filter | null>(null);
  // Default to the work queue when there is any.
  const current: Filter = filter ?? (needs > 0 ? "PAID" : "ALL");
  const shown = current === "ALL" ? query.items : query.items.filter((c) => c.status === current);

  return (
    <ListShell query={query} empty="No paid consultations are in progress.">
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const n = f.value === "ALL" ? query.items.length : query.items.filter((c) => c.status === f.value).length;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={current === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                current === f.value ? "border-primary bg-primary text-white" : "border-border bg-white text-slate-600 hover:bg-secondary",
                f.value === "PAID" && n > 0 && current !== "PAID" && "border-amber-300 bg-amber-50 text-amber-800",
              )}
            >
              {f.label} <span className="opacity-70">{n}</span>
            </button>
          );
        })}
      </div>
      {query.hasNextPage && current !== "ALL" && (
        <p className="text-xs text-muted-foreground">Counts cover the consultations loaded so far — load more below to see the rest.</p>
      )}
      {shown.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Inbox className="size-7 text-subtle-foreground" />
          <p className="font-bold">{current === "PAID" ? "Every paid consultation has an expert" : "Nothing in this list"}</p>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {shown.map((c) => (
            <li key={c.id}>
              <AdminRow consultation={c} />
            </li>
          ))}
        </ul>
      )}
    </ListShell>
  );
}

function CompletedList({ query }: { query: ListQuery }) {
  return (
    <ListShell query={query} empty="No completed consultations yet.">
      <ul className="grid grid-cols-1 gap-3">
        {query.items.map((c) => (
          <li key={c.id}>
            <AdminRow consultation={c} />
          </li>
        ))}
      </ul>
    </ListShell>
  );
}

/** Loading / error / empty states and the "Load more" button around a paginated list. */
function ListShell({ query, empty, children }: { query: ListQuery; empty: string; children: React.ReactNode }) {
  if (query.isPending) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <AlertCircle className="size-6 text-destructive" />
        <p className="text-sm text-muted-foreground">{isApiError(query.error) ? query.error.message : "Couldn't load consultations."}</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }
  if (query.items.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <Inbox className="size-7 text-subtle-foreground" />
        <p className="font-bold">{empty}</p>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4">
      {children}
      {query.hasNextPage && (
        <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className="mx-auto">
          {query.isFetchingNextPage && <Loader2 className="animate-spin" />}
          Load more
        </Button>
      )}
    </div>
  );
}

/** Hours since payment, for the 24–48 h promise. */
function waitingHours(c: Consultation) {
  const from = c.paymentVerifiedAt ?? c.bookedAt;
  return Math.max(0, (Date.now() - new Date(from).getTime()) / 3_600_000);
}

function AdminRow({ consultation: c }: { consultation: Consultation }) {
  const name = c.service?.name ?? "Consultation";
  const unassigned = c.status === "PAID";
  const waited = unassigned ? waitingHours(c) : 0;
  const live = c.status === "ASSIGNED" || c.status === "ONGOING";

  return (
    <article
      className={cn(
        "grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
        unassigned ? "border-amber-200 shadow-[inset_3px_0_0_var(--color-amber-400)]" : "border-border",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <ServiceIcon name={name} className="max-sm:size-10" />
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/consultations/${c.id}`} className="font-bold leading-snug outline-none hover:text-primary focus-visible:underline">
              {name}
            </Link>
            <StatusBadge status={c.status} viewer="admin" />
            <span className="text-sm text-muted-foreground">{formatPrice(c.amount, c.currency)}</span>
          </div>
          <p className="truncate text-[13px] text-slate-700">
            <span className="text-muted-foreground">Client</span> {c.user?.name ?? "—"}
            {c.user?.email && <span className="text-muted-foreground"> · {c.user.email}</span>}
          </p>
          <p className="truncate text-[13px] text-slate-700">
            <span className="text-muted-foreground">Expert</span>{" "}
            {c.sme?.name ?? c.sme?.email ?? <span className="font-semibold text-amber-700">Not assigned</span>}
          </p>
          <p className="text-xs text-subtle-foreground">
            {c.status === "COMPLETED"
              ? `Completed ${formatDate(c.completedAt ?? c.updatedAt)} · booked ${formatDate(c.bookedAt)}`
              : unassigned
                ? (
                    <span className={cn(waited >= 24 && "font-semibold text-amber-700", waited >= 48 && "text-destructive")}>
                      Paid {timeAgo(c.paymentVerifiedAt ?? c.bookedAt)}
                      {waited >= 24 ? " — reply due within 48 h of payment" : ""}
                    </span>
                  )
                : c.startedAt
                  ? `Chat started ${timeAgo(c.startedAt)}`
                  : `Assigned · waiting for the first message`}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:w-72">
        {unassigned && <AssignExpert consultation={c} compact />}
        <Link
          href={`/consultations/${c.id}`}
          className="inline-flex items-center justify-end gap-1 text-sm font-semibold text-primary outline-none hover:underline focus-visible:underline max-sm:justify-start"
        >
          {live ? (
            <>
              <MessageSquare className="size-4" /> Open chat
            </>
          ) : (
            "View details"
          )}
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
