import type {
  Consultation,
  ConsultationMessage,
  ConsultationParty,
  ConsultationService,
  ConsultationStatus,
  MessagePage,
  MessageType,
  PaymentStart,
  PaymentStatus,
} from "@/types/consultation";

import { api } from "./client";
import { isApiError } from "./errors";
import { isObj } from "./normalize";

type AnyObj = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const STATUSES: ConsultationStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "ASSIGNED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
];
const status = (v: unknown): ConsultationStatus =>
  STATUSES.includes(v as ConsultationStatus) ? (v as ConsultationStatus) : "PENDING_PAYMENT";
const unwrap = (body: unknown): unknown => (isObj(body) && isObj(body.data) ? body.data : body);
const asArray = (body: unknown): unknown[] =>
  Array.isArray(body) ? body : isObj(body) && Array.isArray(body.data) ? body.data : [];

export function toService(raw: unknown): ConsultationService | null {
  if (!isObj(raw) || !raw.id) return null;
  return {
    id: String(raw.id),
    name: str(raw.name) ?? "Consultation",
    slug: String(raw.slug ?? ""),
    description: str(raw.description),
    price: num(raw.price),
    currency: (str(raw.currency) ?? "INR").trim(),
    durationDays: num(raw.duration_days) || 7,
  };
}

function toParty(raw: unknown): ConsultationParty | null {
  if (!isObj(raw) || !raw.id) return null;
  return { id: String(raw.id), name: str(raw.name), email: str(raw.email) };
}

export function toConsultation(raw: unknown): Consultation | null {
  if (!isObj(raw) || !raw.id) return null;
  const createdAt = String(raw.created_at ?? raw.booked_at ?? "");
  return {
    id: String(raw.id),
    status: status(raw.status),
    amount: num(raw.amount),
    currency: (str(raw.currency) ?? "INR").trim(),
    service: toService(raw.consultation_services),
    serviceId: String(raw.service_id ?? ""),
    user: toParty(raw.users_consultations_user_idTousers),
    userId: String(raw.user_id ?? ""),
    sme: toParty(raw.users_consultations_sme_idTousers),
    smeId: str(raw.sme_id),
    bookedAt: String(raw.booked_at ?? createdAt),
    startedAt: str(raw.started_at),
    expiresAt: str(raw.expires_at),
    completedAt: str(raw.completed_at),
    paymentVerifiedAt: str(raw.payment_verified_at),
    createdAt,
    updatedAt: String(raw.updated_at ?? createdAt),
  };
}

const MESSAGE_TYPES: MessageType[] = ["TEXT", "IMAGE", "DOCUMENT", "SYSTEM"];

export function toMessage(raw: unknown): ConsultationMessage | null {
  if (!isObj(raw) || !raw.id) return null;
  const sender = isObj(raw.users) ? raw.users : null;
  return {
    id: String(raw.id),
    consultationId: String(raw.consultation_id ?? ""),
    senderId: String(raw.sender_id ?? sender?.id ?? ""),
    senderName: str(sender?.name),
    type: MESSAGE_TYPES.includes(raw.message_type as MessageType) ? (raw.message_type as MessageType) : "TEXT",
    content: typeof raw.content === "string" ? raw.content : null,
    attachmentUrl: str(raw.attachment_url),
    createdAt: String(raw.created_at ?? ""),
    readAt: str(raw.read_at),
  };
}

const toList = (body: unknown) => asArray(body).map(toConsultation).filter((c): c is Consultation => !!c);

// ---------------------------------------------------------------------------
// Services (public)
// ---------------------------------------------------------------------------

/** GET consultation-services — active services, oldest first. */
export async function getConsultationServices(): Promise<ConsultationService[]> {
  return asArray(await api.get<unknown>("consultation-services", { auth: false }))
    .map(toService)
    .filter((s): s is ConsultationService => !!s);
}

/** GET consultation-services/:id */
export async function getConsultationService(id: string): Promise<ConsultationService> {
  const s = toService(unwrap(await api.get<unknown>(`consultation-services/${id}`, { auth: false })));
  if (!s) throw new Error("Service not found");
  return s;
}

// ---------------------------------------------------------------------------
// Bookings (signed-in user)
// ---------------------------------------------------------------------------

/** POST consultations { service_id } → a PENDING_PAYMENT consultation at the service's price. */
export async function bookConsultation(serviceId: string): Promise<Consultation> {
  const c = toConsultation(unwrap(await api.post<unknown>("consultations", { service_id: serviceId })));
  if (!c) throw new Error("Couldn't create the booking.");
  return c;
}

/** GET consultations/me — the signed-in user's bookings, newest first. */
export async function getMyConsultations(): Promise<Consultation[]> {
  return toList(await api.get<unknown>("consultations/me"));
}

/** GET consultations/:id — booking user, assigned SME or ADMIN. */
export async function getConsultation(id: string): Promise<Consultation> {
  const c = toConsultation(unwrap(await api.get<unknown>(`consultations/${id}`)));
  if (!c) throw new Error("Consultation not found");
  return c;
}

/**
 * POST consultations/:id/payment { return_url } → Cashfree payment session. `return_url` must share
 * its origin with the backend's CASHFREE_RETURN_URL; if it doesn't, retry with the configured one.
 */
export async function startPayment(id: string, returnUrl: string): Promise<PaymentStart> {
  let body: unknown;
  try {
    body = await api.post<unknown>(`consultations/${id}/payment`, { return_url: returnUrl });
  } catch (err) {
    if (isApiError(err) && err.status === 400 && /return_url|origin/i.test(err.message)) {
      body = await api.post<unknown>(`consultations/${id}/payment`, {});
    } else {
      throw err;
    }
  }
  const b = (unwrap(body) ?? {}) as AnyObj;
  if (b.status === "PAID") return { kind: "paid" };
  const session = str(b.payment_session_id);
  if (!session) throw new Error("The payment gateway didn't return a session. Please try again.");
  return {
    kind: "checkout",
    paymentSessionId: session,
    orderId: String(b.order_id ?? ""),
    environment: b.environment === "production" ? "production" : "sandbox",
  };
}

/** GET consultations/:id/payment-status — also marks the booking PAID once Cashfree confirms. */
export async function getPaymentStatus(id: string): Promise<PaymentStatus> {
  const b = (unwrap(await api.get<unknown>(`consultations/${id}/payment-status`)) ?? {}) as AnyObj;
  return { status: status(b.status), orderStatus: str(b.order_status) };
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

/** GET consultations/:id/messages?before&limit — oldest→newest within a page; `before` pages back. */
export async function getMessages(id: string, { before, limit = 50 }: { before?: string; limit?: number } = {}): Promise<MessagePage> {
  const body = await api.get<unknown>(`consultations/${id}/messages`, { query: { before, limit } });
  const b = (unwrap(body) ?? {}) as AnyObj;
  return {
    messages: (Array.isArray(b.messages) ? b.messages : [])
      .map(toMessage)
      .filter((m): m is ConsultationMessage => !!m),
    nextCursor: str(b.next_cursor),
    hasMore: b.has_more === true,
  };
}

/** POST consultations/:id/messages — the first message moves ASSIGNED → ONGOING. */
export async function sendMessage(id: string, content: string): Promise<ConsultationMessage | null> {
  return toMessage(unwrap(await api.post<unknown>(`consultations/${id}/messages`, { message_type: "TEXT", content })));
}

/** PATCH consultations/:id/messages/read — marks the other side's messages as read. */
export async function markMessagesRead(id: string): Promise<void> {
  await api.patch<unknown>(`consultations/${id}/messages/read`);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** POST admin/consultations/:id/assign { sme_id } — PAID/ASSIGNED only; (re)assigns the expert. */
export async function assignConsultation(id: string, smeId: string): Promise<Consultation | null> {
  return toConsultation(unwrap(await api.post<unknown>(`admin/consultations/${id}/assign`, { sme_id: smeId })));
}

/** POST admin/consultations/:id/complete — ASSIGNED/ONGOING only; closes the chat. */
export async function completeConsultation(id: string): Promise<Consultation | null> {
  return toConsultation(unwrap(await api.post<unknown>(`admin/consultations/${id}/complete`)));
}

// ---------------------------------------------------------------------------
// Proposed list endpoints (not in the backend yet — see README "Consultations").
// They resolve to `null` while the route doesn't exist, so screens can fall back.
// ---------------------------------------------------------------------------

async function optional<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (err) {
    if (isApiError(err) && [404, 405, 501].includes(err.status)) return null;
    throw err;
  }
}

/** Proposed: GET sme/consultations — consultations assigned to the signed-in SME. */
export const getAssignedConsultations = () => optional(async () => toList(await api.get<unknown>("sme/consultations")));

/** Proposed: GET admin/consultations?status= — every consultation, optionally filtered. */
export const getAllConsultations = (statusFilter?: ConsultationStatus) =>
  optional(async () => toList(await api.get<unknown>("admin/consultations", { query: { status: statusFilter } })));

/** Proposed: GET admin/smes — users with the SME role, for the assign picker. */
export const getSmes = () =>
  optional(async () =>
    asArray(await api.get<unknown>("admin/smes"))
      .map(toParty)
      .filter((p): p is ConsultationParty => !!p),
  );
