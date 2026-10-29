"use client";

import { useState } from "react";
import { AlertCircle, Inbox, ServerCog } from "lucide-react";

import { ConsultationCard, OpenConsultationForm } from "@/components/consultations/consultation-bits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllConsultations, useRecentConsultations } from "@/hooks/use-consultations";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { Consultation, ConsultationStatus } from "@/types/consultation";

const TABS: { key: string; label: string; statuses: ConsultationStatus[] | null }[] = [
  { key: "needs", label: "Needs an expert", statuses: ["PAID"] },
  { key: "active", label: "Active", statuses: ["ASSIGNED", "ONGOING"] },
  { key: "unpaid", label: "Awaiting payment", statuses: ["PENDING_PAYMENT"] },
  { key: "closed", label: "Closed", statuses: ["COMPLETED", "EXPIRED", "CANCELLED", "REFUNDED"] },
  { key: "all", label: "All", statuses: null },
];

/** Admin queue: assign experts to paid consultations and close finished ones. */
export function AdminConsultations() {
  const all = useAllConsultations(undefined, true);
  const recent = useRecentConsultations();
  const [tab, setTab] = useState("needs");

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Manage consultations</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Assign an expert once a booking is paid. They have 24–48 hours to connect; close the consultation when it&apos;s done.
        </p>
      </div>

      {all.isPending ? (
        <div className="grid grid-cols-1 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[84px] rounded-2xl" />
          ))}
        </div>
      ) : all.isError ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <AlertCircle className="size-6 text-destructive" />
          <p className="text-sm text-muted-foreground">{isApiError(all.error) ? all.error.message : "Couldn't load consultations."}</p>
          <Button variant="outline" size="sm" onClick={() => all.refetch()}>
            Try again
          </Button>
        </Card>
      ) : all.data === null ? (
        <Fallback recent={recent} />
      ) : (
        <Queue list={all.data} tab={tab} onTab={setTab} />
      )}
    </div>
  );
}

function Queue({ list, tab, onTab }: { list: Consultation[]; tab: string; onTab: (t: string) => void }) {
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  const count = (statuses: ConsultationStatus[] | null) => (statuses ? list.filter((c) => statuses.includes(c.status)).length : list.length);
  const shown = current.statuses ? list.filter((c) => current.statuses!.includes(c.status)) : list;

  return (
    <>
      <div role="tablist" aria-label="Filter consultations" className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const n = count(t.statuses);
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => onTab(t.key)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                tab === t.key ? "border-primary bg-primary text-white" : "border-border bg-white text-slate-600 hover:bg-secondary",
              )}
            >
              {t.label} <span className="opacity-70">{n}</span>
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <Inbox className="size-7 text-subtle-foreground" />
          <p className="font-bold">Nothing here</p>
          <p className="text-sm text-muted-foreground">
            {current.key === "needs" ? "Every paid consultation has an expert." : "No consultations in this list."}
          </p>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {shown.map((c) => (
            <li key={c.id}>
              <ConsultationCard consultation={c} viewer="admin" />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** While the backend has no "list all consultations" endpoint. */
function Fallback({ recent }: { recent: Consultation[] }) {
  return (
    <>
      <Card className="grid gap-4 p-5">
        <div className="flex gap-3">
          <ServerCog className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="grid gap-1 text-sm">
            <p className="font-bold">The consultation list isn&apos;t available yet</p>
            <p className="text-muted-foreground">
              The backend has endpoints to assign and complete consultations, but none to list them. Until{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">GET admin/consultations</code> exists, open a
              consultation by its link or ID.
            </p>
          </div>
        </div>
        <OpenConsultationForm className="max-w-xl" />
      </Card>
      {recent.length > 0 && (
        <section aria-labelledby="recent-title" className="grid grid-cols-1 gap-3">
          <h2 id="recent-title" className="text-lg font-bold">
            Recently opened
          </h2>
          <ul className="grid grid-cols-1 gap-3">
            {recent.map((c) => (
              <li key={c.id}>
                <ConsultationCard consultation={c} viewer="admin" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
