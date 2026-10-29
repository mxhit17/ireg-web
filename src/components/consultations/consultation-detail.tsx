"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, Clock, Loader2, Lock, ShieldCheck, UserRoundSearch } from "lucide-react";

import { AssignExpert, CompleteConsultation } from "@/components/consultations/admin-actions";
import { ChatPanel } from "@/components/consultations/chat-panel";
import { ServiceIcon, StatusBadge } from "@/components/consultations/consultation-bits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useConsultation, usePayConsultation } from "@/hooks/use-consultations";
import { isApiError } from "@/lib/api/errors";
import { isAdmin, isSme } from "@/lib/api/normalize";
import { bookingNotes } from "@/lib/consultation-local";
import { canMessage, chatClosesAt, formatPrice, STATUS_META, timeLeft } from "@/lib/consultation-status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Consultation } from "@/types/consultation";

type Viewer = "user" | "sme" | "admin";

/** One consultation for whoever may see it: the client, the assigned expert, or an admin. */
export function ConsultationDetail({ id }: { id: string }) {
  const me = useCurrentUser();
  const admin = isAdmin(me);
  // Admins and experts get a "recently opened" list (stopgap for the missing list APIs).
  const query = useConsultation(id, { remember: admin || isSme(me) });

  if (query.isPending) {
    return (
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }
  if (query.isError) {
    const status = isApiError(query.error) ? query.error.status : 0;
    return (
      <Card className="mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-12 text-center">
        <AlertCircle className="size-7 text-destructive" />
        <p className="font-bold">
          {status === 403 ? "You can't open this consultation" : status === 404 || status === 400 ? "Consultation not found" : "Couldn't load this consultation"}
        </p>
        <p className="text-sm text-muted-foreground">
          {status === 403 ? "Only the client, the assigned expert and admins can see it." : "Check the link and try again."}
        </p>
        <Button asChild variant="outline">
          <Link href="/consultations">Back to Consultation</Link>
        </Button>
      </Card>
    );
  }

  const c = query.data;
  // The same account can be an admin and the client/expert; participation wins.
  const viewer: Viewer = c.userId === me?.id ? "user" : c.smeId === me?.id ? "sme" : "admin";
  return <DetailLoaded consultation={c} viewer={viewer} isAdminUser={admin} meId={me?.id} />;
}

function DetailLoaded({
  consultation: c,
  viewer,
  isAdminUser,
  meId,
}: {
  consultation: Consultation;
  viewer: Viewer;
  isAdminUser: boolean;
  meId: string | undefined;
}) {
  const chatVisible = ["ASSIGNED", "ONGOING", "COMPLETED", "EXPIRED"].includes(c.status);
  const participant = viewer !== "admin";
  const sendable = participant && canMessage(c);
  const closes = chatClosesAt(c);
  const closedReason =
    viewer === "admin"
      ? "Admins can read this chat but not reply."
      : c.status === "COMPLETED"
        ? "This consultation is complete. The chat is read-only."
        : closes && closes.getTime() <= Date.now()
          ? `The chat window closed on ${formatDate(closes.toISOString())}.`
          : "The chat is closed.";

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4">
      <Link
        href={viewer === "admin" ? "/admin/consultations" : "/consultations"}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary outline-none hover:underline focus-visible:underline"
      >
        <ArrowLeft className="size-4" /> {viewer === "admin" ? "All consultations" : "Consultation"}
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <Sidebar consultation={c} viewer={viewer} isAdminUser={isAdminUser} />

        <div className="order-first grid min-w-0 gap-3 lg:order-none">
          <MobileHeader consultation={c} viewer={viewer} />
          {chatVisible ? (
            <div className="h-[calc(100dvh-19rem)] min-h-[420px] lg:h-[calc(100dvh-10rem)]">
              <ChatPanel consultation={c} viewer={viewer} meId={meId} canSend={sendable} closedReason={closedReason} />
            </div>
          ) : (
            <StatusPanel consultation={c} viewer={viewer} />
          )}
        </div>
      </div>
    </div>
  );
}

/** Phones: the details card sits below the chat, so show who/what/status above it. */
function MobileHeader({ consultation: c, viewer }: { consultation: Consultation; viewer: Viewer }) {
  const closes = chatClosesAt(c);
  const who =
    viewer === "user" ? c.sme?.name : viewer === "sme" ? c.user?.name : [c.user?.name, c.sme?.name].filter(Boolean).join(" ↔ ");
  const live = c.status === "ASSIGNED" || c.status === "ONGOING";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3 lg:hidden">
      <ServiceIcon name={c.service?.name ?? "Consultation"} className="size-10 [&_svg]:size-5" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold leading-snug">{who || c.service?.name || "Consultation"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[who ? c.service?.name : null, live && closes ? timeLeft(closes) : null].filter(Boolean).join(" · ") ||
            formatPrice(c.amount, c.currency)}
        </p>
      </div>
      <StatusBadge status={c.status} viewer={viewer} />
    </div>
  );
}

/** Non-chat states: waiting for payment, waiting for an expert, cancelled/refunded. */
function StatusPanel({ consultation: c, viewer }: { consultation: Consultation; viewer: Viewer }) {
  const pay = usePayConsultation(c.id);
  const note = viewer === "user" ? bookingNotes.get(c.id) : null;

  if (c.status === "PENDING_PAYMENT") {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Clock className="size-6" />
        </span>
        <p className="text-lg font-bold">{viewer === "user" ? "Complete your payment" : "Waiting for the client's payment"}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {viewer === "user"
            ? "Your booking is saved. Pay to confirm it — an expert connects within 24–48 hours of payment."
            : "Nothing to do until the payment is confirmed."}
        </p>
        {viewer === "user" && (
          <Button size="lg" onClick={() => pay.mutate()} disabled={pay.isPending} className="mt-1 min-w-48">
            {pay.isPending && <Loader2 className="animate-spin" />}
            Pay {formatPrice(c.amount, c.currency)}
          </Button>
        )}
      </Card>
    );
  }

  if (c.status === "PAID") {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-sky-50 text-sky-600">
          <UserRoundSearch className="size-6" />
        </span>
        <p className="text-lg font-bold">{viewer === "admin" ? "Assign an expert" : "We're finding your expert"}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {viewer === "admin"
            ? "Payment is confirmed. Pick an expert in the panel to open the chat."
            : "Payment received. An expert will connect with you within 24–48 hours — this page updates on its own."}
        </p>
        {note && (
          <div className="mt-2 w-full max-w-md rounded-xl bg-muted p-4 text-left">
            <p className="text-xs font-semibold text-muted-foreground">Your question (sent once the chat opens)</p>
            <p className="mt-1 line-clamp-4 text-sm whitespace-pre-line">{note}</p>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Lock className="size-6 text-subtle-foreground" />
      <p className="text-lg font-bold">{STATUS_META[c.status].label}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{STATUS_META[c.status].hint}</p>
    </Card>
  );
}

function Sidebar({ consultation: c, viewer, isAdminUser }: { consultation: Consultation; viewer: Viewer; isAdminUser: boolean }) {
  const name = c.service?.name ?? "Consultation";
  const closes = chatClosesAt(c);
  const steps: { label: string; at: string | null; done: boolean }[] = [
    { label: "Booked", at: c.bookedAt, done: true },
    { label: "Paid", at: c.paymentVerifiedAt, done: !["PENDING_PAYMENT", "CANCELLED"].includes(c.status) },
    { label: "Expert assigned", at: null, done: !!c.smeId },
    { label: "Chat started", at: c.startedAt, done: !!c.startedAt },
    { label: "Completed", at: c.completedAt, done: c.status === "COMPLETED" },
  ];
  const showAdminTools = viewer === "admin" || isAdminUser;

  return (
    <aside className="grid gap-4 lg:sticky lg:top-24">
      <Card className="grid gap-4 p-5">
        <div className="flex items-start gap-3">
          <ServiceIcon name={name} />
          <div className="grid min-w-0 flex-1 justify-items-start gap-1">
            <h1 className="font-bold leading-snug">{name}</h1>
            <p className="text-sm text-muted-foreground">{formatPrice(c.amount, c.currency)}</p>
            <StatusBadge status={c.status} viewer={viewer} />
          </div>
        </div>

        <dl className="grid gap-2 border-t border-border pt-4 text-sm">
          {viewer !== "user" && <Row term="Client" value={c.user?.name ?? c.user?.email ?? "—"} />}
          {viewer !== "sme" && <Row term="Expert" value={c.sme?.name ?? (c.status === "PAID" ? "Being assigned" : "—")} />}
          <Row term="Booked" value={formatDate(c.bookedAt)} />
          {closes && (
            <Row
              term="Chat open until"
              value={
                <>
                  {formatDate(closes.toISOString())}
                  {(c.status === "ASSIGNED" || c.status === "ONGOING") && (
                    <span className="block text-xs text-muted-foreground">{timeLeft(closes)}</span>
                  )}
                </>
              }
            />
          )}
          {viewer === "admin" && <Row term="Reference" value={<span className="font-mono text-xs break-all">{c.id}</span>} />}
        </dl>

        <ol className="grid gap-2.5 border-t border-border pt-4" aria-label="Progress">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-2.5 text-sm">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 shrink-0 rounded-full ring-4",
                  s.done ? "bg-primary ring-primary-soft" : "bg-slate-200 ring-transparent",
                )}
              />
              <span className={cn(s.done ? "font-semibold text-foreground" : "text-muted-foreground")}>{s.label}</span>
              {s.at && s.done && <span className="ml-auto text-xs text-subtle-foreground">{formatDate(s.at)}</span>}
              <span className="sr-only">{s.done ? "(done)" : "(pending)"}</span>
            </li>
          ))}
        </ol>
      </Card>

      {showAdminTools && (c.status === "PAID" || c.status === "ASSIGNED" || c.status === "ONGOING") && (
        <Card className="grid gap-4 border-dashed p-5">
          <p className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="size-4 text-primary" /> Admin
          </p>
          {(c.status === "PAID" || c.status === "ASSIGNED") && <AssignExpert consultation={c} />}
          {(c.status === "ASSIGNED" || c.status === "ONGOING") && <CompleteConsultation consultation={c} />}
        </Card>
      )}
    </aside>
  );
}

function Row({ term, value }: { term: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0 text-right font-medium">{value}</dd>
    </div>
  );
}
