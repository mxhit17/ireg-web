"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePayConsultation, usePaymentStatus } from "@/hooks/use-consultations";
import { isApiError } from "@/lib/api/errors";

const FAILED_ORDER = ["EXPIRED", "TERMINATED", "TERMINATION_REQUESTED"];

/**
 * Cashfree returns here with `?consultation_id=…` (the backend appends it). The payment is
 * confirmed server-side; we poll `payment-status` until it settles.
 */
export function PaymentReturn() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("consultation_id");
  const status = usePaymentStatus(id);
  const pay = usePayConsultation(id ?? "");
  const d = status.data;
  const paid = !!d && d.status !== "PENDING_PAYMENT";
  const failed = !!d && !paid && FAILED_ORDER.includes(d.orderStatus ?? "");
  const gaveUp = !!d && !paid && !failed && d.attempts >= 10;

  // Take the user straight to their consultation once confirmed.
  useEffect(() => {
    if (!paid || !id) return;
    const t = setTimeout(() => router.replace(`/consultations/${id}`), 2500);
    return () => clearTimeout(t);
  }, [paid, id, router]);

  if (!id) {
    return (
      <Shell icon={<XCircle className="size-10 text-destructive" />} title="Missing booking reference">
        <p>We couldn&apos;t tell which consultation this payment was for.</p>
        <Button asChild variant="outline">
          <Link href="/consultations">Go to Consultation</Link>
        </Button>
      </Shell>
    );
  }

  if (status.isError) {
    return (
      <Shell icon={<XCircle className="size-10 text-destructive" />} title="Couldn't check your payment">
        <p>{isApiError(status.error) ? status.error.message : "Please try again in a moment."}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => status.refetch()}>Check again</Button>
          <Button asChild variant="outline">
            <Link href={`/consultations/${id}`}>Open consultation</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (paid) {
    return (
      <Shell icon={<CheckCircle2 className="size-10 text-emerald-600" />} title="Payment successful">
        <p>Your booking is confirmed. An expert will connect with you within 24–48 hours.</p>
        <Button asChild>
          <Link href={`/consultations/${id}`}>Go to your consultation</Link>
        </Button>
      </Shell>
    );
  }

  if (failed) {
    return (
      <Shell icon={<XCircle className="size-10 text-destructive" />} title="Payment didn't go through">
        <p>No money was taken for this attempt. You can try again.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => pay.mutate()} disabled={pay.isPending}>
            {pay.isPending && <Loader2 className="animate-spin" />}
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href={`/consultations/${id}`}>Open consultation</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (gaveUp) {
    return (
      <Shell icon={<Clock className="size-10 text-amber-500" />} title="Still waiting for confirmation">
        <p>
          If money left your account, the booking will update automatically once the bank confirms. You don&apos;t need
          to pay again.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => status.refetch()}>Check again</Button>
          <Button asChild variant="outline">
            <Link href={`/consultations/${id}`}>Open consultation</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell icon={<Loader2 className="size-10 animate-spin text-primary" />} title="Confirming your payment…">
      <p>This usually takes a few seconds. Please don&apos;t close this page.</p>
    </Shell>
  );
}

function Shell({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card role="status" aria-live="polite" className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-12 text-center text-sm text-muted-foreground">
      {icon}
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      {children}
    </Card>
  );
}
