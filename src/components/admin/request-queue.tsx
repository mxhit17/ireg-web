"use client";

import Link from "next/link";
import { AlertCircle, ChevronRight, Inbox, MapPin, UserRound } from "lucide-react";

import { ProjectThumb } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePendingProjectRequests } from "@/hooks/use-project-requests";
import { isApiError } from "@/lib/api/errors";
import { formatProjectLocation, timeAgo } from "@/lib/format";

/** GET projects/requests — pending requests, oldest first so nothing waits too long. */
export function RequestQueue() {
  const pending = usePendingProjectRequests();

  if (pending.isPending) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (pending.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <AlertCircle className="size-7 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {isApiError(pending.error) ? pending.error.message : "Couldn't load requests."}
        </p>
        <Button variant="outline" onClick={() => pending.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  const items = [...pending.data].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (items.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <Inbox className="size-8 text-subtle-foreground" />
        <p className="text-lg font-bold">All caught up</p>
        <p className="text-sm text-muted-foreground">There are no project requests waiting for review.</p>
      </Card>
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((r) => (
        <li key={r.id}>
          <Link
            href={`/admin/project-requests/${r.id}`}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-4 outline-none transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <ProjectThumb src={r.imageUrl} className="size-16 rounded-xl" />
            <div className="grid min-w-0 flex-1 gap-0.5">
              {r.builderName && <p className="truncate text-xs font-semibold text-muted-foreground">{r.builderName}</p>}
              <p className="truncate font-bold">{r.name}</p>
              {formatProjectLocation(r) && (
                <p className="flex items-center gap-1 truncate text-[13px] text-slate-600">
                  <MapPin className="size-3.5 shrink-0 text-primary" /> {formatProjectLocation(r)}
                </p>
              )}
              <p className="flex items-center gap-1 truncate text-xs text-subtle-foreground">
                <UserRound className="size-3.5 shrink-0" />
                {r.requester ? `${r.requester.name} · ${r.requester.email}` : "Unknown user"} · {timeAgo(r.createdAt)}
              </p>
            </div>
            <span className="hidden items-center gap-1 text-sm font-semibold text-primary sm:flex">
              Review <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
