"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, UserRoundCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAssignConsultation, useCompleteConsultation, useSmes } from "@/hooks/use-consultations";
import type { Consultation } from "@/types/consultation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admin: assign (or reassign) an expert — POST admin/consultations/:id/assign { sme_id }.
 * Uses a picker when the proposed `GET admin/smes` exists, otherwise takes the SME's user ID.
 */
export function AssignExpert({ consultation: c }: { consultation: Consultation }) {
  const smes = useSmes(true);
  const assign = useAssignConsultation(c.id);
  const [smeId, setSmeId] = useState(c.smeId ?? "");
  const [error, setError] = useState<string | null>(null);
  const reassign = !!c.smeId;
  const list = smes.data;

  function submit() {
    const id = smeId.trim();
    if (!UUID.test(id)) return setError(list ? "Choose an expert" : "Paste the expert's user ID (a UUID)");
    if (id === c.smeId) return setError("That expert is already assigned");
    setError(null);
    assign.mutate(id);
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-2"
    >
      <label htmlFor="assign-sme" className="text-sm font-semibold">
        {reassign ? "Reassign expert" : "Assign an expert"}
      </label>
      {list ? (
        <select
          id="assign-sme"
          value={smeId}
          onChange={(e) => {
            setSmeId(e.target.value);
            setError(null);
          }}
          aria-invalid={!!error}
          className="h-11 w-full cursor-pointer rounded-lg border border-input bg-field px-3 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15"
        >
          <option value="">{list.length ? "Choose an expert" : "No SME accounts yet"}</option>
          {list.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ?? s.email ?? s.id}
              {s.name && s.email ? ` (${s.email})` : ""}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id="assign-sme"
          value={smeId}
          onChange={(e) => {
            setSmeId(e.target.value);
            setError(null);
          }}
          placeholder={smes.isPending ? "Loading experts…" : "Expert's user ID"}
          aria-invalid={!!error}
          className="h-11 font-mono text-sm"
        />
      )}
      {error ? (
        <p className="text-[13px] font-medium text-destructive">{error}</p>
      ) : (
        !list &&
        !smes.isPending && (
          <p className="text-xs text-muted-foreground">The backend can&apos;t list SMEs yet, so paste the expert&apos;s user ID.</p>
        )
      )}
      <Button type="submit" disabled={assign.isPending}>
        {assign.isPending ? <Loader2 className="animate-spin" /> : <UserRoundCheck />}
        {reassign ? "Reassign" : "Assign expert"}
      </Button>
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
