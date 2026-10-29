"use client";

import Link from "next/link";
import { AlertCircle, BriefcaseBusiness, ChevronRight, Clock, Inbox, ShieldCheck } from "lucide-react";

import { ConsultationCard, OpenConsultationForm, ServiceCard } from "@/components/consultations/consultation-bits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useAllConsultations,
  useAssignedConsultations,
  useConsultationServices,
  useMyConsultations,
  useRecentConsultations,
} from "@/hooks/use-consultations";
import { isApiError } from "@/lib/api/errors";
import { isAdmin, isSme } from "@/lib/api/normalize";
import { isActive } from "@/lib/consultation-status";
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
  const mine = useMyConsultations();
  const list = mine.data ?? [];
  const active = list.filter(isActive);
  const past = list.filter((c) => !isActive(c));
  if (hideWhenEmpty && mine.isSuccess && list.length === 0) return null;

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

/** SME: consultations assigned to me (needs the proposed `GET sme/consultations`). */
function AssignedSection() {
  const me = useCurrentUser();
  const assigned = useAssignedConsultations(true);
  const recent = useRecentConsultations().filter((c) => c.smeId === me?.id);
  const active = (assigned.data ?? []).filter(isActive);

  return (
    <section aria-labelledby="assigned-title" className="grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="assigned-title" className="text-lg font-bold">
          Assigned to you
        </h2>
        <span className="text-xs font-semibold text-violet-700">Expert view</span>
      </div>
      {assigned.isPending ? (
        <Skeleton className="h-[84px] rounded-2xl" />
      ) : assigned.isError ? (
        <ErrorCard error={assigned.error} onRetry={() => assigned.refetch()} what="your assignments" />
      ) : assigned.data === null ? (
        <div className="grid gap-4">
          <p className="text-sm text-slate-700">
            Open a consultation from the link the IREG team shares with you. (The backend can&apos;t list your
            assignments yet.)
          </p>
          <OpenConsultationForm className="max-w-xl" />
          {recent.length > 0 && (
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-muted-foreground">Recently opened</p>
              <ConsultationList list={recent} viewer="sme" />
            </div>
          )}
        </div>
      ) : active.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing assigned right now. New consultations will appear here.</p>
      ) : (
        <ConsultationList list={active} viewer="sme" />
      )}
    </section>
  );
}

/** Admin: link to the queue, with the "needs an expert" count when the list API exists. */
function AdminBanner() {
  const paid = useAllConsultations("PAID", true);
  const waiting = paid.data?.length ?? null;
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
              ? "No paid consultations are waiting for an expert."
              : `${waiting} paid consultation${waiting === 1 ? " is" : "s are"} waiting for an expert.`}
        </p>
      </div>
      {!!waiting && <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold text-white">{waiting}</span>}
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
