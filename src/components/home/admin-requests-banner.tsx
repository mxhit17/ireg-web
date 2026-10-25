"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";

import { usePendingProjectRequests } from "@/hooks/use-project-requests";

/** Admins only: nudge when users' project requests are waiting for review. */
export function AdminRequestsBanner() {
  const pending = usePendingProjectRequests();
  const count = pending.data?.length ?? 0;
  if (count === 0) return null;

  return (
    <Link
      href="/admin/project-requests"
      className="group flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm outline-none hover:border-sky-300 focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
        <ClipboardCheck className="size-5" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="font-bold text-accent-foreground">
          {count} project request{count === 1 ? "" : "s"} waiting for review
        </span>
        <span className="block text-xs text-sky-800/80">Verify, approve or reject what users have submitted.</span>
      </span>
      <span className="inline-flex items-center gap-1 font-semibold text-primary">
        Review <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
