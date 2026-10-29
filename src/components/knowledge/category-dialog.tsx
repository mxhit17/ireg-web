"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateCategory } from "@/hooks/use-knowledge";

/** Admin: POST admin/knowledge/categories (name ≤ 200, optional description & display order). */
export function CategoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const create = useCreateCategory();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setName("");
      setDescription("");
      setOrder("");
      setError(null);
      create.reset();
      d.showModal();
    }
    if (!open && d.open) d.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit() {
    const n = name.trim();
    if (n.length < 2) return setError("Enter a category name");
    if (n.length > 200) return setError("Use at most 200 characters");
    const displayOrder = order.trim() === "" ? undefined : Number(order);
    if (displayOrder !== undefined && (!Number.isInteger(displayOrder) || displayOrder < 0)) {
      return setError("Display order must be a whole number (0 or more)");
    }
    setError(null);
    create.mutate({ name: n, description, displayOrder }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="cat-title"
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === ref.current) onOpenChange(false);
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-white p-0 text-foreground shadow-2xl backdrop:bg-slate-900/45"
    >
      <form
        method="dialog"
        noValidate
        className="grid gap-4 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="cat-title" className="text-lg font-bold">
              New category
            </h2>
            <p className="text-sm text-muted-foreground">The URL slug is generated from the name.</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="-mt-1 -mr-1 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>

        <FormField id="cat-name" label="Name" error={error ?? undefined}>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Land Records"
            maxLength={200}
            autoFocus
            aria-invalid={!!error}
          />
        </FormField>
        <FormField id="cat-desc" label="Description" hint="Shown under the name on the Knowledge Base page.">
          <textarea
            id="cat-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="e.g. Khata, mutation, encumbrance certificates and how to read them."
            className="w-full resize-y rounded-lg border border-input bg-field px-4 py-3 text-[15px] outline-none placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-primary/15"
          />
        </FormField>
        <FormField id="cat-order" label="Display order" hint="Lower numbers appear first. Leave empty for 0.">
          <Input
            id="cat-order"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="w-32"
          />
        </FormField>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Loader2 className="animate-spin" />}
            Create category
          </Button>
        </div>
      </form>
    </dialog>
  );
}
