"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, UserRoundCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAssignConsultation, useCompleteConsultation, useSmes } from "@/hooks/use-consultations";
import { cn } from "@/lib/utils";
import type { Consultation } from "@/types/consultation";

/**
 * Admin: assign (or reassign) an expert — POST admin/consultations/:id/assign { sme_id }, picking
 * from GET admin/consultations/smes. `compact` is the one-line version used in the queue.
 */
export function AssignExpert({ consultation: c, compact = false }: { consultation: Consultation; compact?: boolean }) {
  const smes = useSmes();
  const assign = useAssignConsultation(c.id);
  const [smeId, setSmeId] = useState(c.smeId ?? "");
  const [error, setError] = useState<string | null>(null);
  const reassign = !!c.smeId;
  const list = smes.data ?? [];
  const inputId = `assign-sme-${c.id}`;

  function submit() {
    if (!smeId) return setError("Choose an expert");
    if (smeId === c.smeId) return setError("That expert is already assigned");
    setError(null);
    assign.mutate(smeId);
  }

  const select = (
    <select
      id={inputId}
      value={smeId}
      onChange={(e) => {
        setSmeId(e.target.value);
        setError(null);
      }}
      disabled={smes.isPending || assign.isPending}
      aria-invalid={!!error}
      aria-label={compact ? `Expert for ${c.service?.name ?? "this consultation"}` : undefined}
      className={cn(
        "w-full min-w-0 cursor-pointer rounded-lg border border-input bg-field px-3 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15 aria-invalid:border-destructive disabled:cursor-wait",
        compact ? "h-10 text-sm" : "h-11",
      )}
    >
      <option value="">
        {smes.isPending ? "Loading experts…" : smes.isError ? "Couldn't load experts" : list.length ? "Choose an expert" : "No experts yet"}
      </option>
      {list.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name ?? s.email ?? "Unnamed expert"}
          {s.name && s.email ? ` · ${s.email}` : ""}
        </option>
      ))}
    </select>
  );

  const button = (
    <Button type="submit" disabled={assign.isPending || smes.isPending} className={cn(compact && "h-10 shrink-0")}>
      {assign.isPending ? <Loader2 className="animate-spin" /> : <UserRoundCheck />}
      {reassign ? "Reassign" : compact ? "Assign" : "Assign expert"}
    </Button>
  );

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-2"
    >
      {compact ? (
        <div className="flex gap-2">
          {select}
          {button}
        </div>
      ) : (
        <>
          <label htmlFor={inputId} className="text-sm font-semibold">
            {reassign ? "Reassign expert" : "Assign an expert"}
          </label>
          {select}
        </>
      )}
      {error && <p className="text-[13px] font-medium text-destructive">{error}</p>}
      {smes.isError && (
        <button type="button" onClick={() => smes.refetch()} className="w-fit cursor-pointer text-xs font-semibold text-primary hover:underline">
          Retry loading experts
        </button>
      )}
      {!compact && button}
    </form>
  );
}

/** Admin: close the consultation — POST admin/consultations/:id/complete (with confirmation). */
export function CompleteConsultation({ consultation: c }: { consultation: Consultation }) {
  const complete = useCompleteConsultation(c.id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <CheckCircle2 /> Mark as complete
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="complete-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!complete.isPending) setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === ref.current && !complete.isPending) setOpen(false);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-white p-0 text-foreground shadow-2xl backdrop:bg-slate-900/45"
      >
        <div className="grid gap-4 p-5 sm:p-6">
          <div className="grid gap-1">
            <h2 id="complete-title" className="text-lg font-bold">
              Complete this consultation?
            </h2>
            <p className="text-sm text-muted-foreground">
              The chat closes for {c.user?.name ?? "the client"} and {c.sme?.name ?? "the expert"}. They can still read
              the conversation.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={complete.isPending}>
              Cancel
            </Button>
            <Button onClick={() => complete.mutate(undefined, { onSuccess: () => setOpen(false) })} disabled={complete.isPending}>
              {complete.isPending && <Loader2 className="animate-spin" />}
              Complete
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
