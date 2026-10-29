import type { Consultation, ConsultationStatus } from "@/types/consultation";

export const STATUS_META: Record<ConsultationStatus, { label: string; tone: string; hint: string }> = {
  PENDING_PAYMENT: {
    label: "Payment pending",
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
    hint: "Complete the payment to confirm your booking.",
  },
  PAID: {
    label: "Finding your expert",
    tone: "bg-sky-50 text-sky-800 ring-sky-200",
    hint: "Payment received. An expert will connect with you within 24–48 hours.",
  },
  ASSIGNED: {
    label: "Expert assigned",
    tone: "bg-violet-50 text-violet-800 ring-violet-200",
    hint: "Your expert is ready — send your question to start the chat.",
  },
  ONGOING: { label: "Ongoing", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200", hint: "The chat is open." },
  COMPLETED: { label: "Completed", tone: "bg-slate-100 text-slate-700 ring-slate-200", hint: "This consultation is closed." },
  CANCELLED: { label: "Cancelled", tone: "bg-slate-100 text-slate-700 ring-slate-200", hint: "This booking was cancelled." },
  EXPIRED: { label: "Expired", tone: "bg-slate-100 text-slate-700 ring-slate-200", hint: "The chat window has ended." },
  REFUNDED: { label: "Refunded", tone: "bg-rose-50 text-rose-800 ring-rose-200", hint: "The payment was refunded." },
};

/** Statuses shown under "Ongoing" (Figma "Ongoing Consultations"). */
export const ACTIVE_STATUSES: ConsultationStatus[] = ["PENDING_PAYMENT", "PAID", "ASSIGNED", "ONGOING"];
export const isActive = (c: Pick<Consultation, "status">) => ACTIVE_STATUSES.includes(c.status);

/** "₹500" — Figma shows "Rs. 500/-"; this is the same in standard Indian notation. */
export function formatPrice(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/**
 * When the chat closes: the API's `expires_at` if set, otherwise `started_at + duration_days`
 * (7 by default — "the chat will remain open for 7 days"). Null until the chat has started.
 */
export function chatClosesAt(c: Consultation): Date | null {
  if (c.expiresAt) return new Date(c.expiresAt);
  if (!c.startedAt) return null;
  const days = c.service?.durationDays ?? 7;
  return new Date(new Date(c.startedAt).getTime() + days * 86_400_000);
}

/** Whether new messages can be sent right now (the API accepts ASSIGNED and ONGOING). */
export function canMessage(c: Consultation, now = Date.now()) {
  if (c.status !== "ASSIGNED" && c.status !== "ONGOING") return false;
  const closes = chatClosesAt(c);
  return !closes || closes.getTime() > now;
}

/** "3 days left", "5 hours left", "less than an hour left". */
export function timeLeft(until: Date, now = Date.now()) {
  const ms = until.getTime() - now;
  if (ms <= 0) return "closed";
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "less than an hour left";
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} left`;
  const d = Math.floor(h / 24);
  return `${d} days left`;
}
