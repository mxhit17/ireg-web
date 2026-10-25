"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, FileClock, MapPin, Plus } from "lucide-react";

import { RequestStatusBadge } from "@/components/project-requests/request-status-badge";
import { ProjectThumb } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProjectRequests } from "@/hooks/use-project-requests";
import { isApiError } from "@/lib/api/errors";
import { formatProjectLocation, timeAgo } from "@/lib/format";

/** GET projects/requests/mine — every request the user sent, with its review status. */
export function MyRequestsList() {
  const requests = useMyProjectRequests();

  if (requests.isPending) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (requests.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <AlertCircle className="size-7 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {isApiError(requests.error) ? requests.error.message : "Couldn't load your requests."}
        </p>
        <Button variant="outline" onClick={() => requests.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  if (requests.data.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <FileClock className="size-8 text-subtle-foreground" />
        <p className="text-lg font-bold">No requests yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Can&apos;t find a project on IREG? Send it to us and we&apos;ll add it after a quick review.
        </p>
        <Button asChild className="mt-1">
          <Link href="/projects/new">
            <Plus /> Create Project
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <ul className="grid gap-3">
      {requests.data.map((r) => (
        <li key={r.id}>
          <Card className="flex gap-4 p-4">
            <ProjectThumb src={r.imageUrl} className="size-16 rounded-xl" />
            <div className="grid min-w-0 flex-1 gap-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {r.builderName && <p className="truncate text-xs font-semibold text-muted-foreground">{r.builderName}</p>}
                  <p className="truncate font-bold">{r.name}</p>
                </div>
                <RequestStatusBadge status={r.requestStatus} />
              </div>
              {formatProjectLocation(r) && (
                <p className="flex items-center gap-1 truncate text-[13px] text-slate-600">
                  <MapPin className="size-3.5 shrink-0 text-primary" /> {formatProjectLocation(r)}
                </p>
              )}
              <p className="text-xs text-subtle-foreground">
                Sent {timeAgo(r.createdAt)}
                {r.reviewedAt && ` · Reviewed ${timeAgo(r.reviewedAt)}`}
              </p>
              {r.requestStatus === "REJECTED" && r.rejectionReason && (
                <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
                  <span className="font-semibold">Reason:</span> {r.rejectionReason}
                </p>
              )}
              {r.requestStatus === "APPROVED" && r.projectId && (
                <Link
                  href={`/projects/${r.projectId}`}
                  className="mt-1 inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  View project <ArrowRight className="size-4" />
                </Link>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
