/** Prisma enum `consultation_status`. */
export type ConsultationStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "ASSIGNED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

/** Prisma enum `message_type`. */
export type MessageType = "TEXT" | "IMAGE" | "DOCUMENT" | "SYSTEM";

/** GET consultation-services — e.g. Chartered Accountant, Lawyer, Banker. */
export interface ConsultationService {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** Decimal from the API, as a number. */
  price: number;
  currency: string;
  /** How long the chat stays open once it starts (default 7). */
  durationDays: number;
}

export interface ConsultationParty {
  id: string;
  name: string | null;
  email: string | null;
}

/** GET admin/consultations/smes — experts an admin can assign. */
export interface SmeOption extends ConsultationParty {
  phone: string | null;
  profileImageUrl: string | null;
}

/** Backend `paginate()` → `{ data, meta }`. */
export interface Paged<T> {
  items: T[];
  page: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface Consultation {
  id: string;
  status: ConsultationStatus;
  amount: number;
  currency: string;
  service: ConsultationService | null;
  serviceId: string;
  user: ConsultationParty | null;
  userId: string;
  sme: ConsultationParty | null;
  smeId: string | null;
  bookedAt: string;
  startedAt: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  paymentVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationMessage {
  id: string;
  consultationId: string;
  senderId: string;
  senderName: string | null;
  type: MessageType;
  content: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  readAt: string | null;
  /** Client-only: optimistic message not yet confirmed by the server. */
  pending?: boolean;
}

export interface MessagePage {
  messages: ConsultationMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** POST consultations/:id/payment */
export type PaymentStart =
  | { kind: "checkout"; paymentSessionId: string; environment: "sandbox" | "production"; orderId: string }
  | { kind: "paid" };

/** GET consultations/:id/payment-status */
export interface PaymentStatus {
  status: ConsultationStatus;
  orderStatus: string | null;
}
