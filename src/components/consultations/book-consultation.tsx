"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { FormField } from "@/components/auth/form-field";
import { ServiceIcon, withArticle } from "@/components/consultations/consultation-bits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookConsultation, useConsultationService } from "@/hooks/use-consultations";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { isApiError } from "@/lib/api/errors";
import { formatPrice } from "@/lib/consultation-status";
import { normalizeIndianMobile } from "@/lib/validation/profile";

const NOTE_MAX = 2000;

/** Figma "book-consultation": "Consult a chartered accountant", doubts box, "Pay Rs. 500/-". */
export function BookConsultation({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const service = useConsultationService(serviceId);
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const book = useBookConsultation();
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // Cashfree needs the buyer's mobile number; ask only if the profile doesn't have a valid one.
  const needsPhone = profile.isSuccess && !normalizeIndianMobile(profile.data.phone ?? "");
  const busy = book.isPending || updateProfile.isPending || leaving;

  async function pay() {
    if (!service.data) return;
    if (note.length > NOTE_MAX) return;
    if (needsPhone) {
      const normalized = normalizeIndianMobile(phone);
      if (!normalized) {
        setPhoneError("Enter a valid 10-digit Indian mobile number");
        document.getElementById("book-phone")?.focus();
        return;
      }
      try {
        await updateProfile.mutateAsync({ phone: normalized });
      } catch (err) {
        setPhoneError(isApiError(err) ? err.message : "Couldn't save your number.");
        return;
      }
    }
    book.mutate(
      { serviceId, note },
      {
        onSuccess: ({ consultation, result }) => {
          if (result === "paid") router.push(`/consultations/${consultation.id}`);
          else setLeaving(true); // Cashfree is taking over the page
        },
        onError: (err) => {
          const id = (err as { consultationId?: string }).consultationId;
          toast.error(err instanceof Error ? err.message : "Couldn't start the payment.");
          // The booking was created — continue (and retry payment) from its page.
          if (id) router.push(`/consultations/${id}`);
        },
      },
    );
  }

  if (service.isPending) {
    return (
      <div className="mx-auto grid max-w-5xl gap-4">
        <Skeleton className="h-8 w-80 rounded-lg" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (service.isError) {
    return (
      <Card className="mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-12 text-center">
        <AlertCircle className="size-7 text-destructive" />
        <p className="font-bold">This service isn&apos;t available</p>
        <Button asChild variant="outline">
          <Link href="/consultations">See all services</Link>
        </Button>
      </Card>
    );
  }

  const s = service.data;
  const price = formatPrice(s.price, s.currency);

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6">
      <Link
        href="/consultations"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary outline-none hover:underline focus-visible:underline"
      >
        <ArrowLeft className="size-4" /> Consultation
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">Consult {withArticle(s.name.toLowerCase())}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Book a consultation</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void pay();
          }}
          className="grid content-start gap-5 rounded-2xl border border-border bg-white p-5 sm:p-6"
        >
          <FormField
            id="book-note"
            label="Your question"
            hint={`Ready to send as your first message once your expert joins · ${note.length}/${NOTE_MAX}`}
            error={note.length > NOTE_MAX ? `Keep it under ${NOTE_MAX} characters` : undefined}
          >
            <textarea
              id="book-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={7}
              placeholder="Write in brief about your doubts."
              className="w-full resize-y rounded-lg border border-input bg-field px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-primary/15"
            />
          </FormField>

          {needsPhone && (
            <FormField
              id="book-phone"
              label="Mobile number"
              error={phoneError ?? undefined}
              hint="Required by our payment partner. Saved to your profile; never shown to others."
            >
              <Input
                id="book-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError(null);
                }}
                aria-invalid={!!phoneError}
              />
            </FormField>
          )}

          <Button type="submit" size="lg" disabled={busy || profile.isPending} className="w-full">
            {busy && <Loader2 className="animate-spin" />}
            {leaving ? "Opening payment…" : `Pay ${price}`}
          </Button>
          <p className="-mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> Secure payment by Cashfree. You&apos;ll come back here when it&apos;s done.
          </p>
        </form>

        <aside className="grid gap-4 rounded-2xl border border-border bg-white p-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <ServiceIcon name={s.name} />
            <div className="min-w-0">
              <p className="font-bold">{s.name}</p>
              <p className="text-lg font-extrabold text-primary">{price}</p>
            </div>
          </div>
          {s.description && <p className="text-sm text-slate-600">{s.description}</p>}
          <ol className="grid gap-3 border-t border-border pt-4 text-sm">
            {[
              ["Pay securely", "Your booking is confirmed once the payment goes through."],
              ["Get matched", "An expert connects with you within 24–48 hours."],
              ["Chat", `Ask anything — the chat stays open for ${s.durationDays} days.`],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold">{title}</span>
                  <span className="block text-muted-foreground">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
