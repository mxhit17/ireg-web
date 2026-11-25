"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { CircleCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMyFeedback, useSubmitFeedback } from "@/hooks/use-feedback";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FEEDBACK_MAX_RATING, FEEDBACK_MESSAGE_MAX, FEEDBACK_MIN_RATING, type Feedback } from "@/types/feedback";

const RATINGS = Array.from({ length: FEEDBACK_MAX_RATING }, (_, i) => i + FEEDBACK_MIN_RATING);

/**
 * Figma "feedback" screen (Profile → Feedback): title + intro, the "How likely would you recommend
 * us…" 1–10 scale with Not likely / Very likely labels, an optional message, Submit and a thank-you
 * note. POST feedback; GET feedback/me shows when the user last sent feedback.
 */
export function FeedbackForm() {
  const mine = useMyFeedback();
  const submit = useSubmitFeedback();
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [showRatingError, setShowRatingError] = useState(false);
  const [sent, setSent] = useState<Feedback | null>(null);

  const tooLong = message.length > FEEDBACK_MESSAGE_MAX;
  const ids = { question: useId(), message: useId(), messageHint: useId(), ratingError: useId() };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === null) {
      setShowRatingError(true);
      return;
    }
    if (tooLong || submit.isPending) return;
    submit.mutate(
      { rating, message },
      {
        onSuccess: (saved) => {
          setSent(saved ?? { id: "", rating, message: message.trim() || null, createdAt: new Date().toISOString() });
          setRating(null);
          setMessage("");
          setShowRatingError(false);
        },
      },
    );
  }

  if (sent) return <ThankYou feedback={sent} onSendMore={() => setSent(null)} />;

  const latest = mine.data?.latest;

  return (
    <section
      aria-labelledby="feedback-title"
      className="rounded-2xl border border-border bg-white px-5 py-8 sm:px-8"
    >
      <h1 id="feedback-title" className="text-[28px] leading-[34px] font-extrabold tracking-tight">
        Share your feedback
      </h1>
      <p className="mt-3 text-base text-slate-600">Help us make your real estate journey better.</p>

      {latest && (
        <p className="mt-3 text-[13px] text-muted-foreground">
          You last rated us <span className="font-semibold text-foreground">{latest.rating}/10</span>
          {latest.createdAt && <> · {timeAgo(latest.createdAt)}</>}. Tell us again any time — we read every response.
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-10 grid gap-0">
        <fieldset
          aria-describedby={showRatingError && rating === null ? ids.ratingError : undefined}
          className="m-0 min-w-0 border-0 p-0"
        >
          <legend id={ids.question} className="mb-4 text-base leading-6 font-bold">
            How likely would you recommend us to people in the real estate market?
          </legend>
          <RatingScale
            value={rating}
            labelledBy={ids.question}
            invalid={showRatingError && rating === null}
            onChange={(v) => {
              setRating(v);
              setShowRatingError(false);
            }}
          />
          <div className="mt-2.5 flex justify-between text-xs leading-[18px] text-muted-foreground" aria-hidden>
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
          {showRatingError && rating === null && (
            <p id={ids.ratingError} role="alert" className="mt-2 text-sm font-medium text-destructive">
              Choose a rating from 1 to 10.
            </p>
          )}
        </fieldset>

        <div className="mt-10 grid gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={ids.message} className="text-base leading-6 font-bold">
              Your feedback
            </label>
            <span className="text-[13px] text-muted-foreground">Optional</span>
          </div>
          <textarea
            id={ids.message}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            aria-invalid={tooLong || undefined}
            aria-describedby={ids.messageHint}
            placeholder="Tell us what worked well or what we could do better…"
            className={cn(
              "min-h-[164px] w-full resize-y rounded-md border border-slate-300 bg-muted px-4 py-[15px] text-[15px] leading-[23px] outline-none placeholder:text-muted-foreground",
              "focus-visible:border-primary focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-primary/15",
              tooLong && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15",
            )}
          />
          <p
            id={ids.messageHint}
            className={cn("-mt-1 text-right text-xs", tooLong ? "font-medium text-destructive" : "text-subtle-foreground")}
          >
            {tooLong ? `Keep it under ${FEEDBACK_MESSAGE_MAX} characters · ` : ""}
            {message.length}/{FEEDBACK_MESSAGE_MAX}
          </p>
        </div>

        <Button
          type="submit"
          disabled={submit.isPending || tooLong}
          className="mt-4 h-[52px] w-full rounded-md text-base font-bold sm:w-[300px]"
        >
          {submit.isPending && <Loader2 className="animate-spin" />}
          Submit feedback
        </Button>

        <p className="mt-5 text-center text-[13px] leading-5 text-muted-foreground sm:text-left">
          Thank you for helping us improve.
        </p>
      </form>
    </section>
  );
}

/**
 * The 1–10 scale: ten equal boxes as a radio group. Arrow keys move the choice, Home/End jump
 * to 1/10; only the selected box (or 1 when nothing is chosen) is in the tab order.
 */
function RatingScale({
  value,
  onChange,
  labelledBy,
  invalid,
}: {
  value: number | null;
  onChange: (v: number) => void;
  labelledBy: string;
  invalid: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function choose(v: number) {
    const next = Math.min(FEEDBACK_MAX_RATING, Math.max(FEEDBACK_MIN_RATING, v));
    onChange(next);
    refs.current[next - FEEDBACK_MIN_RATING]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-required
      aria-invalid={invalid || undefined}
      className="grid grid-cols-10 gap-1 sm:gap-1.5"
      onKeyDown={(e) => {
        const current = value ?? 0;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          choose(current + 1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          choose(current === 0 ? FEEDBACK_MIN_RATING : current - 1);
        } else if (e.key === "Home") {
          e.preventDefault();
          choose(FEEDBACK_MIN_RATING);
        } else if (e.key === "End") {
          e.preventDefault();
          choose(FEEDBACK_MAX_RATING);
        }
      }}
    >
      {RATINGS.map((n, i) => {
        const selected = value === n;
        return (
          <button
            key={n}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${n} out of 10`}
            tabIndex={selected || (value === null && n === FEEDBACK_MIN_RATING) ? 0 : -1}
            onClick={() => onChange(n)}
            className={cn(
              "flex h-[42px] cursor-pointer items-center justify-center rounded-[6px] border text-sm leading-5 font-bold tabular-nums transition-colors outline-none",
              "focus-visible:ring-[3px] focus-visible:ring-ring/40",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-slate-300 bg-muted text-slate-700 hover:border-primary/60 hover:bg-primary-soft hover:text-accent-foreground",
              invalid && !selected && "border-destructive/50",
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

function ThankYou({ feedback, onSendMore }: { feedback: Feedback; onSendMore: () => void }) {
  return (
    <section
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-white px-6 py-14 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <CircleCheck className="size-7" aria-hidden />
      </span>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Thanks for your feedback!</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          You rated us <span className="font-semibold text-foreground">{feedback.rating}/10</span>. Thank you for helping us
          improve.
        </p>
      </div>
      {feedback.message && (
        <blockquote className="max-w-md rounded-xl bg-muted px-4 py-3 text-left text-sm whitespace-pre-line text-slate-600">
          {feedback.message}
        </blockquote>
      )}
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">Back to threads</Link>
        </Button>
        <Button variant="outline" onClick={onSendMore}>
          Send more feedback
        </Button>
      </div>
    </section>
  );
}
