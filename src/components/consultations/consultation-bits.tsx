"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Calculator,
  ChevronRight,
  Compass,
  HardHat,
  Landmark,
  MessageSquare,
  Scale,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, STATUS_META } from "@/lib/consultation-status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Consultation, ConsultationService, ConsultationStatus } from "@/types/consultation";

// ---------------------------------------------------------------------------
// Service icon — Figma "ca-avatar" (calculator) / "lawyer-avatar": 48px tinted circle
// ---------------------------------------------------------------------------

const ICONS: [RegExp, LucideIcon, string][] = [
  [/chartered|account|\bca\b|tax|audit/i, Calculator, "bg-sky-100 text-sky-700"],
  [/law|legal|advocate|solicitor/i, Scale, "bg-violet-100 text-violet-700"],
  [/bank|loan|finance|mortgage/i, Landmark, "bg-emerald-100 text-emerald-700"],
  [/architect|engineer|construct|structur/i, HardHat, "bg-amber-100 text-amber-700"],
  [/vastu|interior|design/i, Compass, "bg-rose-100 text-rose-700"],
];

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const [, Icon, tint] = ICONS.find(([re]) => re.test(name)) ?? [null, BriefcaseBusiness, "bg-slate-100 text-slate-700"];
  return (
    <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", tint, className)}>
      <Icon className="size-6" strokeWidth={1.75} />
    </span>
  );
}

/** "a Lawyer", "an Architect" — for "Consult a chartered accountant". */
export const withArticle = (name: string) => `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name}`;

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

/** Labels are written for the client; experts and admins get their own wording where it differs. */
const STAFF_LABELS: Partial<Record<ConsultationStatus, string>> = { PAID: "Needs an expert", ASSIGNED: "Assigned" };

export function StatusBadge({
  status,
  viewer = "user",
  className,
}: {
  status: ConsultationStatus;
  viewer?: "user" | "sme" | "admin";
  className?: string;
}) {
  const meta = STATUS_META[status];
  const label = (viewer !== "user" && STAFF_LABELS[status]) || meta.label;
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", meta.tone, className)}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Figma "consultation-cards": avatar · name + description · price
// ---------------------------------------------------------------------------

export function ServiceCard({ service }: { service: ConsultationService }) {
  return (
    <Link
      href={`/consultations/book/${service.id}`}
      className="group flex h-full items-center gap-3 rounded-2xl border border-border bg-white p-4 outline-none transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      <ServiceIcon name={service.name} />
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug">{service.name}</p>
        {service.description && <p className="mt-0.5 line-clamp-2 text-[13px] text-slate-600">{service.description}</p>}
        <p className="mt-1 text-xs text-subtle-foreground">{service.durationDays}-day chat with an expert</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-bold text-foreground">{formatPrice(service.price, service.currency)}</span>
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
          Book <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/**
 * Figma "ongoing-consultations" card with a "Chat" action. `viewer` decides whose name is shown:
 * the booking user sees the expert, the expert/admin sees the client.
 */
export function ConsultationCard({ consultation: c, viewer }: { consultation: Consultation; viewer: "user" | "sme" | "admin" }) {
  const name = c.service?.name ?? "Consultation";
  const other =
    viewer === "user"
      ? c.sme?.name
        ? `with ${c.sme.name}`
        : null
      : viewer === "sme"
        ? c.user?.name
          ? `for ${c.user.name}`
          : null
        : [c.user?.name ?? c.user?.email, c.sme?.name ? `→ ${c.sme.name}` : null].filter(Boolean).join(" ");
  const action =
    c.status === "PENDING_PAYMENT" && viewer === "user"
      ? "Pay"
      : c.status === "ASSIGNED" || c.status === "ONGOING"
        ? "Chat"
        : c.status === "PAID" && viewer === "admin"
          ? "Assign"
          : "View";
  return (
    <Link
      href={`/consultations/${c.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-white p-4 outline-none transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      <ServiceIcon name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-bold leading-snug">{name}</p>
          <StatusBadge status={c.status} viewer={viewer} />
        </div>
        <p className="mt-1 truncate text-[13px] text-slate-600">
          {[other, `Booked ${formatDate(c.bookedAt)}`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 text-sm font-bold",
          action === "Chat" || action === "Pay" || action === "Assign" ? "text-primary" : "text-muted-foreground",
        )}
      >
        {action === "Chat" && <MessageSquare className="size-4" />}
        {action}
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Open a consultation by link or ID (SME/admin fallback while list APIs are missing)
// ---------------------------------------------------------------------------

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function OpenConsultationForm({ className }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className={cn("grid gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const id = value.match(UUID)?.[0];
        if (!id) return setError("Paste a consultation link or ID");
        router.push(`/consultations/${id.toLowerCase()}`);
      }}
    >
      <label htmlFor="open-consultation" className="text-sm font-semibold">
        Open a consultation
      </label>
      <div className="flex gap-2">
        <Input
          id="open-consultation"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="Paste the consultation link or ID"
          aria-invalid={!!error}
          className="h-11"
        />
        <Button type="submit" className="h-11 shrink-0">
          Open <ArrowRight />
        </Button>
      </div>
      {error && <p className="text-[13px] font-medium text-destructive">{error}</p>}
    </form>
  );
}
