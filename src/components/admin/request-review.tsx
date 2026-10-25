"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, Loader2, Search, ShieldCheck, Trash2, UserRound, X } from "lucide-react";

import { SimilarProjects } from "@/components/project-requests/similar-projects";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApproveProjectRequest,
  usePendingProjectRequests,
  useRejectProjectRequest,
} from "@/hooks/use-project-requests";
import { projectStatusLabel, projectTypeLabel, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectRequest } from "@/types/project-request";

/**
 * Figma "project-verification-screen": the photo, read-only Builder / Project / Location, and
 * Delete (→ reject with a reason) · Verify (→ duplicate search) · Approve Project.
 * There's no GET-by-id endpoint, so the request is read from the pending list.
 */
export function RequestReview({ id }: { id: string }) {
  const pending = usePendingProjectRequests();
  const approve = useApproveProjectRequest();
  const [approved, setApproved] = useState<{ projectId: string | null; name: string } | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const request = pending.data?.find((r) => r.id === id);
  const queue = [...(pending.data ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const next = queue.find((r) => r.id !== id);

  if (approved) {
    return (
      <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-green-50 text-green-600">
          <CheckCircle2 className="size-8" />
        </span>
        <div>
          <h2 className="text-xl font-bold">“{approved.name}” is live</h2>
          <p className="mt-1 text-sm text-muted-foreground">The project was created and is now visible to everyone.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {approved.projectId && (
            <Button asChild variant="outline">
              <Link href={`/projects/${approved.projectId}`}>View project</Link>
            </Button>
          )}
          <NextOrQueue next={next} />
        </div>
      </Card>
    );
  }

  if (pending.isPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!request) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <ShieldCheck className="size-8 text-subtle-foreground" />
        <p className="text-lg font-bold">This request is no longer pending</p>
        <p className="text-sm text-muted-foreground">It may already have been approved or rejected.</p>
        <NextOrQueue next={next} />
      </Card>
    );
  }

  const extras: [string, string | null][] = [
    ["Type", projectTypeLabel(request.type)],
    ["Status", projectStatusLabel(request.status)],
    ["Description", request.description],
  ];

  return (
    <div className="grid gap-5">
      <div className="overflow-hidden rounded-xl border border-border bg-primary-soft">
        {request.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={request.imageUrl} alt={request.name} className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]" />
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center text-primary">
            <Building2 className="size-12" />
          </div>
        )}
      </div>

      <Card className="grid gap-3 rounded-xl border-input bg-field p-4">
        <ReadOnly label="Builder" value={request.builderName} />
        <ReadOnly label="Project" value={request.name} />
        <ReadOnly
          label="Location"
          value={[request.location, request.locality, request.city, request.state].filter(Boolean).join(", ") || null}
        />
        {extras.map(([label, value]) => value && <ReadOnly key={label} label={label} value={value} />)}
        <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <UserRound className="size-3.5" />
          Requested by {request.requester ? `${request.requester.name} (${request.requester.email})` : "a user"} ·{" "}
          {timeAgo(request.createdAt)}
        </p>
      </Card>

      {verifyOpen && <VerifyPanel request={request} onClose={() => setVerifyOpen(false)} />}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setRejectOpen(true)}
          disabled={approve.isPending}
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-[#dc2626] px-6 text-lg font-bold text-white shadow-sm outline-none hover:bg-[#b91c1c] focus-visible:ring-4 focus-visible:ring-red-300 disabled:opacity-60 sm:px-8"
        >
          <Trash2 className="size-5" /> Reject
        </button>
        <button
          type="button"
          onClick={() => setVerifyOpen((v) => !v)}
          aria-expanded={verifyOpen}
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-[#16a34a] px-6 text-lg font-bold text-white shadow-sm outline-none hover:bg-[#15803d] focus-visible:ring-4 focus-visible:ring-green-300 sm:px-8"
        >
          <Search className="size-5" /> Verify
        </button>
      </div>

      <Button
        size="lg"
        className="h-14 w-full rounded-xl text-xl font-bold"
        disabled={approve.isPending}
        onClick={() =>
          approve.mutate(request.id, {
            onSuccess: (project) => setApproved({ projectId: project?.id ?? null, name: request.name }),
          })
        }
      >
        {approve.isPending ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
        {approve.isPending ? "Approving…" : "Approve Project"}
      </Button>

      <RejectDialog request={request} open={rejectOpen} onOpenChange={setRejectOpen} />
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-h-10 rounded-lg bg-border px-3 py-2 text-base font-medium break-words">
        {value ?? <span className="text-subtle-foreground">Not provided</span>}
      </span>
    </div>
  );
}

/** Figma "verify-search-screen": search existing projects to spot duplicates before approving. */
function VerifyPanel({ request, onClose }: { request: ProjectRequest; onClose: () => void }) {
  const [q, setQ] = useState(request.name);
  return (
    <Card className="grid gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">Is this project already on IREG?</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close verify"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="relative">
        <label htmlFor="verify-q" className="sr-only">
          Search existing projects
        </label>
        <input
          id="verify-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-12 w-full rounded-[18px] border border-border bg-white pr-11 pl-4 font-semibold outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15"
        />
        <Search className="pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2" />
      </div>
      <SimilarProjects query={q} variant="verify" />
      <p className="text-xs text-muted-foreground">
        Tip: try the builder name or the locality too. If it already exists, reject the request with that reason.
      </p>
    </Card>
  );
}

const REASONS = [
  "This project already exists on IREG.",
  "We couldn't verify this project from the details provided.",
  "The photo doesn't show the project.",
  "This isn't a real estate project.",
];

/**
 * Figma "Are you sure? This will permanently delete the verification request." — the backend
 * rejects the request and emails the reason to the requester, so a reason is required.
 */
function RejectDialog({
  request,
  open,
  onOpenChange,
}: {
  request: ProjectRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const reject = useRejectProjectRequest();
  const [reason, setReason] = useState(REASONS[0]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const valid = reason.trim().length >= 5;

  return (
    <dialog
      ref={ref}
      aria-labelledby="reject-title"
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === ref.current) onOpenChange(false);
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-white p-0 text-foreground shadow-2xl backdrop:bg-slate-900/45"
    >
      <form
        method="dialog"
        className="grid gap-4 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          reject.mutate({ id: request.id, reason }, { onSuccess: () => onOpenChange(false) });
        }}
      >
        <div>
          <h2 id="reject-title" className="text-lg font-bold">
            Are you sure?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This will reject the request for <span className="font-semibold text-foreground">{request.name}</span> and
            remove it from the queue. {request.requester?.name ?? "The requester"} will be emailed the reason.
          </p>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">Reason</legend>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                aria-pressed={reason === r}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  reason === r ? "border-primary bg-primary-soft text-accent-foreground" : "border-border hover:bg-secondary",
                )}
              >
                {r.replace(/\.$/, "")}
              </button>
            ))}
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            aria-label="Reason for rejecting"
            className="w-full resize-y rounded-lg border border-input bg-field px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-primary/15"
          />
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={reject.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={!valid || reject.isPending}>
            {reject.isPending && <Loader2 className="animate-spin" />}
            Reject request
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function NextOrQueue({ next }: { next?: ProjectRequest }) {
  return next ? (
    <Button asChild>
      <Link href={`/admin/project-requests/${next.id}`}>
        Next request <ArrowRight />
      </Link>
    </Button>
  ) : (
    <Button asChild variant="outline">
      <Link href="/admin/project-requests">Back to requests</Link>
    </Button>
  );
}
