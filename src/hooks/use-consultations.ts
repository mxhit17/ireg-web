"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  assignConsultation,
  bookConsultation,
  completeConsultation,
  getAllConsultations,
  getAssignedConsultations,
  getConsultation,
  getConsultationService,
  getConsultationServices,
  getMessages,
  getMyConsultations,
  getPaymentStatus,
  getSmes,
  markMessagesRead,
  sendMessage,
  startPayment,
} from "@/lib/api/consultations";
import { isApiError } from "@/lib/api/errors";
import { openCashfreeCheckout } from "@/lib/cashfree";
import { bookingNotes, recentConsultations } from "@/lib/consultation-local";
import type { Consultation, ConsultationMessage, ConsultationStatus, MessagePage } from "@/types/consultation";

export const consultKeys = {
  all: ["consultations"] as const,
  services: ["consultations", "services"] as const,
  service: (id: string) => ["consultations", "services", id] as const,
  mine: ["consultations", "mine"] as const,
  assigned: ["consultations", "assigned"] as const,
  admin: (status?: ConsultationStatus) => ["consultations", "admin", status ?? "ALL"] as const,
  smes: ["consultations", "smes"] as const,
  detail: (id: string) => ["consultations", "detail", id] as const,
  latestMessages: (id: string) => ["consultations", "detail", id, "messages"] as const,
};

const errMsg = (err: unknown, fallback: string) => (isApiError(err) || err instanceof Error ? err.message : fallback);

/** Return page for Cashfree; the backend appends `consultation_id`. */
export const paymentReturnUrl = () => `${window.location.origin}/consultations/payment-return`;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function useConsultationServices() {
  return useQuery({ queryKey: consultKeys.services, queryFn: getConsultationServices, staleTime: 10 * 60 * 1000 });
}

export function useConsultationService(id: string) {
  return useQuery({ queryKey: consultKeys.service(id), queryFn: () => getConsultationService(id), staleTime: 10 * 60 * 1000 });
}

export function useMyConsultations(enabled = true) {
  return useQuery({ queryKey: consultKeys.mine, queryFn: getMyConsultations, enabled, refetchInterval: 60_000 });
}

/** SME assignments — `data === null` means the backend doesn't offer the list yet. */
export function useAssignedConsultations(enabled: boolean) {
  return useQuery({ queryKey: consultKeys.assigned, queryFn: getAssignedConsultations, enabled, refetchInterval: 60_000 });
}

/** Admin list — `data === null` means the backend doesn't offer the list yet. */
export function useAllConsultations(status: ConsultationStatus | undefined, enabled: boolean) {
  return useQuery({
    queryKey: consultKeys.admin(status),
    queryFn: () => getAllConsultations(status),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useSmes(enabled: boolean) {
  return useQuery({ queryKey: consultKeys.smes, queryFn: getSmes, enabled, staleTime: 5 * 60 * 1000 });
}

/**
 * One consultation. While it's waiting on something outside this page (payment confirmation or
 * an expert being assigned) it re-checks every 20 s.
 */
export function useConsultation(id: string, { remember = false }: { remember?: boolean } = {}) {
  const query = useQuery({
    queryKey: consultKeys.detail(id),
    queryFn: () => getConsultation(id),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "PAID" || s === "ASSIGNED" || s === "PENDING_PAYMENT" ? 20_000 : false;
    },
  });
  useEffect(() => {
    if (remember && query.data) recentConsultations.remember(query.data);
  }, [remember, query.data]);
  return query;
}

/** Consultations this SME/admin opened recently (local stopgap for missing list endpoints). */
export function useRecentConsultations() {
  const [list, setList] = useState<Consultation[]>([]);
  useEffect(() => {
    setList(recentConsultations.list());
    return recentConsultations.subscribe(() => setList(recentConsultations.list()));
  }, []);
  return list;
}

// ---------------------------------------------------------------------------
// Booking + payment
// ---------------------------------------------------------------------------

async function payFor(consultationId: string): Promise<"redirected" | "paid"> {
  const start = await startPayment(consultationId, paymentReturnUrl());
  if (start.kind === "paid") return "paid";
  await openCashfreeCheckout(start.paymentSessionId, start.environment);
  return "redirected";
}

/** Book → remember the note → open Cashfree checkout (the page navigates away on success). */
export function useBookConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serviceId, note }: { serviceId: string; note: string }) => {
      const consultation = await bookConsultation(serviceId);
      bookingNotes.set(consultation.id, note);
      qc.invalidateQueries({ queryKey: consultKeys.mine });
      try {
        return { consultation, result: await payFor(consultation.id) };
      } catch (err) {
        // The booking exists; payment can be retried from its page.
        throw Object.assign(err instanceof Error ? err : new Error(String(err)), { consultationId: consultation.id });
      }
    },
  });
}

/** Retry payment for an existing PENDING_PAYMENT booking. */
export function usePayConsultation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => payFor(id),
    onSuccess: (result) => {
      if (result === "paid") {
        qc.invalidateQueries({ queryKey: consultKeys.all });
        toast.success("Payment confirmed");
      }
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't start the payment.")),
  });
}

/** After Cashfree redirects back: poll until the payment settles (≈ 30 s max). */
export function usePaymentStatus(id: string | null) {
  const qc = useQueryClient();
  const attempts = useRef(0);
  return useQuery({
    queryKey: ["consultations", "payment-status", id],
    enabled: !!id,
    queryFn: async () => {
      attempts.current += 1;
      const s = await getPaymentStatus(id!);
      if (s.status !== "PENDING_PAYMENT") qc.invalidateQueries({ queryKey: consultKeys.all });
      return { ...s, attempts: attempts.current };
    },
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return 3000;
      const settled = d.status !== "PENDING_PAYMENT" || ["EXPIRED", "TERMINATED", "TERMINATION_REQUESTED"].includes(d.orderStatus ?? "");
      return settled || d.attempts >= 10 ? false : 3000;
    },
    retry: 2,
  });
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

const POLL_MS = 5000;

/**
 * Messages for one consultation: the newest page is polled every 5 s while the tab is visible,
 * older pages load on demand, and sent messages appear instantly (optimistic).
 */
export function useChat(id: string, { enabled, meId }: { enabled: boolean; meId: string | undefined }) {
  const qc = useQueryClient();
  const latest = useQuery({
    queryKey: consultKeys.latestMessages(id),
    queryFn: () => getMessages(id, { limit: 50 }),
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
    refetchIntervalInBackground: false,
  });
  const [older, setOlder] = useState<ConsultationMessage[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null | undefined>(undefined);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pending, setPending] = useState<ConsultationMessage[]>([]);

  const latestMessages = latest.data?.messages;
  const messages = useMemo(() => {
    const byId = new Map<string, ConsultationMessage>();
    for (const m of [...older, ...(latestMessages ?? [])]) byId.set(m.id, m);
    const list = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    return [...list, ...pending];
  }, [older, latestMessages, pending]);

  // Cursor for "load older": the server's cursor for the first page, then our oldest message.
  const cursor = olderCursor === undefined ? (latest.data?.hasMore ? latest.data.nextCursor : null) : olderCursor;

  const loadOlder = useCallback(async () => {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await getMessages(id, { before: cursor, limit: 50 });
      setOlder((prev) => [...page.messages, ...prev]);
      setOlderCursor(page.hasMore ? page.nextCursor : null);
    } catch (err) {
      toast.error(errMsg(err, "Couldn't load older messages."));
    } finally {
      setLoadingOlder(false);
    }
  }, [cursor, id, loadingOlder]);

  const send = useMutation({
    mutationFn: (content: string) => sendMessage(id, content),
    onMutate: (content) => {
      const temp: ConsultationMessage = {
        id: `temp-${Date.now()}`,
        consultationId: id,
        senderId: meId ?? "",
        senderName: null,
        type: "TEXT",
        content,
        attachmentUrl: null,
        createdAt: new Date().toISOString(),
        readAt: null,
        pending: true,
      };
      setPending((p) => [...p, temp]);
      return { tempId: temp.id };
    },
    onSuccess: (msg, _content, ctx) => {
      // Swap the optimistic bubble for the saved message in one render, then re-sync.
      if (msg) {
        qc.setQueryData<MessagePage>(consultKeys.latestMessages(id), (old) =>
          old ? { ...old, messages: [...old.messages.filter((m) => m.id !== msg.id), msg] } : old,
        );
      }
      setPending((p) => p.filter((m) => m.id !== ctx?.tempId));
      qc.invalidateQueries({ queryKey: consultKeys.latestMessages(id) });
      // First message turns ASSIGNED into ONGOING.
      qc.invalidateQueries({ queryKey: consultKeys.detail(id) });
    },
    onError: (err, _content, ctx) => {
      setPending((p) => p.filter((m) => m.id !== ctx?.tempId));
      toast.error(errMsg(err, "Message not sent."));
    },
  });

  // Mark the other side's messages read whenever new unread ones arrive.
  const lastMarked = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !meId || !latestMessages?.length) return;
    const unread = latestMessages.filter((m) => m.senderId !== meId && !m.readAt);
    const newest = unread.at(-1)?.id ?? null;
    if (!newest || newest === lastMarked.current) return;
    lastMarked.current = newest;
    markMessagesRead(id).catch(() => {
      lastMarked.current = null;
    });
  }, [enabled, meId, latestMessages, id]);

  return {
    messages,
    isPending: latest.isPending && enabled,
    isError: latest.isError,
    error: latest.error,
    refetch: latest.refetch,
    hasOlder: !!cursor,
    loadingOlder,
    loadOlder,
    send,
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

function useAdminWrite<V>(fn: (v: V) => Promise<Consultation | null>, success: string, failure: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (updated) => {
      if (updated) {
        qc.setQueryData(consultKeys.detail(id), () => updated);
        recentConsultations.remember(updated);
      }
      qc.invalidateQueries({ queryKey: consultKeys.all });
      toast.success(success);
    },
    onError: (err) => toast.error(errMsg(err, failure)),
  });
}

export function useAssignConsultation(id: string) {
  return useAdminWrite((smeId: string) => assignConsultation(id, smeId), "Expert assigned — the chat is open", "Couldn't assign the expert.", id);
}

export function useCompleteConsultation(id: string) {
  return useAdminWrite(() => completeConsultation(id), "Consultation marked complete", "Couldn't complete the consultation.", id);
}
