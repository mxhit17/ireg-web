"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, BriefcaseBusiness, ChevronRight, Clock, Inbox, Loader2, ShieldCheck } from "lucide-react";

import { ConsultationCard, OpenConsultationForm, ServiceCard } from "@/components/consultations/consultation-bits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useConsultationList, useConsultationServices, useMyConsultations } from "@/hooks/use-consultations";
import { isApiError } from "@/lib/api/errors";
import { isAdmin, isSme } from "@/lib/api/normalize";
import { loginHref } from "@/lib/auth/constants";
import { isActive } from "@/lib/consultation-status";
import { cn } from "@/lib/utils";
import type { Consultation } from "@/types/consultation";

/**
 * Figma "consultations-home": services to book + "Ongoing Consultations".
 * SMEs also get "Assigned to you"; admins get a link to the management queue.
 */
export function ConsultationsHome() {
  const user = useCurrentUser();
  const admin = isAdmin(user);
  const sme = isSme(user);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">Consultation</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Book a lawyer, chartered accountant or banker. An expert connects with you over chat within 24–48 hours.
        </p>
      </div>

      {admin && <AdminBanner />}
      {sme && <AssignedSection />}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <ServicesSection />
        <MineSection hideWhenEmpty={sme || admin} />
      </div>
    </div>
  );
}

function ServicesSection() {
  const services = useConsultationServices();
  return (
    <section aria-labelledby="services-title" className="grid min-w-0 grid-cols-1 content-start gap-3">
      <h2 id="services-title" className="text-lg font-bold">
        Book a consultation
      </h2>
      {services.isPending ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[92px] rounded-2xl" />
          ))}
        </div>
      ) : services.isError ? (
        <ErrorCard error={services.error} onRetry={() => services.refetch()} what="services" />
      ) : services.data.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <BriefcaseBusiness className="size-7 text-subtle-foreground" />
          <p className="font-bold">No services available right now</p>
          <p className="text-sm text-muted-foreground">Please check back soon.</p>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {services.data.map((s) => (
            <li key={s.id}>
              <ServiceCard service={s} />
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-1 grid gap-2 text-[13px] text-muted-foreground sm:grid-cols-3">
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" /> Verified experts
        </li>
        <li className="flex items-center gap-2">
          <Clock className="size-4 text-primary" /> Reply within 24–48 hours
        </li>
        <li className="flex items-center gap-2">
          <BriefcaseBusiness className="size-4 text-primary" /> Secure payment via Cashfree
        </li>
      </ul>
    </section>
  );
}

function MineSection({ hideWhenEmpty }: { hideWhenEmpty: boolean }) {
  const user = useCurrentUser();
  const mine = useMyConsultations(!!user);
  const list = mine.data ?? [];
  const active = list.filter(isActive);
  const past = list.filter((c) => !isActive(c));
  if (hideWhenEmpty && mine.isSuccess && list.length === 0) return null;

  if (!user) {
    return (
      <section aria-labelledby="mine-title" className="grid min-w-0 grid-cols-1 content-start gap-3 lg:sticky lg:top-24">
        <h2 id="mine-title" className="text-lg font-bold">
          Ongoing consultations
        </h2>
        <Card className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <Inbox className="size-7 text-subtle-foreground" />
          <p className="text-sm text-muted-foreground">Log in to book an expert and see your consultations here.</p>
          <Button asChild>
            <Link href={loginHref("/consultations")}>Log in</Link>
          </Button>
        </Card>
      </section>
    );
  }

  return (
    <section aria-labelledby="mine-title" className="grid min-w-0 grid-cols-1 content-start gap-3 lg:sticky lg:top-24">
      <h2 id="mine-title" className="text-lg font-bold">
        Ongoing consultations
      </h2>
      {mine.isPending ? (
        <div className="grid grid-cols-1 gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[84px] rounded-2xl" />
          ))}
        </div>
      ) : mine.isError ? (
        <ErrorCard error={mine.error} onRetry={() => mine.refetch()} what="your consultations" />
      ) : active.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <Inbox className="size-7 text-subtle-foreground" />
          <p className="font-bold">No ongoing consultations</p>
          <p className="text-sm text-muted-foreground">Book an expert and your chat will show up here.</p>
        </Card>
      ) : (
        <ConsultationList list={active} viewer="user" />
      )}
      {past.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 py-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" /> Past consultations ({past.length})
          </summary>
          <div className="mt-2">
            <ConsultationList list={past} viewer="user" />
          </div>
        </details>
      )}
    </section>
  );
}

function ConsultationList({ list, viewer }: { list: Consultation[]; viewer: "user" | "sme" | "admin" }) {
  return (
    <ul className="grid grid-cols-1 gap-3">
      {list.map((c) => (
        <li key={c.id}>
          <ConsultationCard consultation={c} viewer={viewer} />
        </li>
      ))}
    </ul>
  );
}

/** SME: my ongoing chats (GET sme/consultations/ongoing) and finished ones (…/completed). */
function AssignedSection() {
  const [tab, setTab] = useState<"ongoing" | "completed">("ongoing");
  const ongoing = useConsultationList("sme-ongoing");
  const completed = useConsultationList("sme-completed", tab === "completed");
  const q = tab === "ongoing" ? ongoing : completed;

  return (
    <section aria-labelledby="assigned-title" className="grid min-w-0 grid-cols-1 gap-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="assigned-title" className="text-lg font-bold">
            Your clients
          </h2>
          <p className="text-sm text-muted-foreground">Consultations assigned to you as an expert.</p>
        </div>
        <div role="tablist" aria-label="Your consultations" className="flex rounded-xl bg-white p-1 ring-1 ring-violet-200">
          {(
            [
              ["ongoing", "Ongoing", ongoing],
              ["completed", "Completed", completed],
            ] as const
          ).map(([key, label, query]) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                tab === key ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-violet-50",
              )}
            >
              {label}
              {query.isSuccess && <span className="ml-1 opacity-75">{query.total}</span>}
            </button>
          ))}
        </div>
      </div>

      {q.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[84px] rounded-2xl" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorCard error={q.error} onRetry={() => q.refetch()} what="your consultations" />
      ) : q.items.length === 0 ? (
        <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-violet-100">
          {tab === "ongoing" ? "No ongoing chats right now." : "No completed consultations yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {q.items.map((c) => (
            <li key={c.id}>
              <ConsultationCard consultation={c} viewer="sme" />
            </li>
          ))}
        </ul>
      )}
      {q.hasNextPage && (
        <Button variant="outline" size="sm" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage} className="mx-auto bg-white">
          {q.isFetchingNextPage && <Loader2 className="animate-spin" />}
          Load more
        </Button>
      )}

      {tab === "ongoing" && (
        <details className="group text-sm">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 font-semibold text-violet-700 hover:underline">
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" /> Newly assigned? Open it from its link
          </summary>
          <p className="mt-2 text-muted-foreground">
            A consultation shows here once its chat has started. To send the first message on a new assignment, open the
            link the IREG team shared with you.
          </p>
          <OpenConsultationForm className="mt-3 max-w-xl" />
        </details>
      )}
    </section>
  );
}

/** Admin: link to the queue, with how many paid consultations still need an expert. */
function AdminBanner() {
  const active = useConsultationList("admin-active");
  const waiting = active.isSuccess ? active.items.filter((c) => c.status === "PAID").length : null;
  const more = active.hasNextPage ? "+" : "";
  return (
    <Link
      href="/admin/consultations"
      className="group flex items-center gap-3 rounded-2xl border border-border bg-white p-4 outline-none hover:border-slate-300 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
        <ShieldCheck className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">Manage consultations</p>
        <p className="text-sm text-muted-foreground">
          {waiting === null
            ? "Assign experts and close finished consultations."
            : waiting === 0
              ? `${active.total} in progress · every paid consultation has an expert.`
              : `${waiting}${more} paid consultation${waiting === 1 && !more ? " is" : "s are"} waiting for an expert.`}
        </p>
      </div>
      {!!waiting && (
        <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-sm font-bold text-white">
          {waiting}
          {more}
        </span>
      )}
      <ChevronRight className="size-5 text-subtle-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function ErrorCard({ error, onRetry, what }: { error: unknown; onRetry: () => void; what: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      <AlertCircle className="size-6 text-destructive" />
      <p className="text-sm text-muted-foreground">{isApiError(error) ? error.message : `Couldn't load ${what}.`}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}
