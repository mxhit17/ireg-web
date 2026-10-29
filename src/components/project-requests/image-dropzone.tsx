"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ACCEPTED_IMAGE_TYPES, validateImage } from "@/lib/image";
import { cn } from "@/lib/utils";

/**
 * Figma "Tap to upload photo" box: click or drop one image; shows a preview with Change / Remove.
 */
export function ImageDropzone({
  value,
  onChange,
  invalid,
  describedBy,
  inputId = "project-image",
  existingUrl,
  alt = "Selected project photo",
  className,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  invalid?: boolean;
  describedBy?: string;
  inputId?: string;
  /** Image already saved on the server; shown (with "Change") until a new file is picked. */
  existingUrl?: string | null;
  alt?: string;
  /** Aspect/size overrides for the box and preview. */
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function pick(file: File | undefined) {
    if (!file) return;
    const problem = validateImage(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    onChange(file);
  }

  const input = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(",")}
      className="sr-only"
      aria-describedby={describedBy}
      aria-invalid={invalid}
      onChange={(e) => {
        pick(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  const shown = preview ?? existingUrl ?? null;
  if (shown) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-input bg-field">
        {input}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shown} alt={alt} className={cn("aspect-[4/3] w-full object-cover sm:aspect-[16/9]", className)} />
        <div className="absolute right-3 bottom-3 flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white/95 px-3 text-sm font-semibold shadow-md outline-none hover:bg-white focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <RefreshCw className="size-4" /> Change
          </button>
          {preview && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={existingUrl ? "Undo photo change" : "Remove photo"}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg bg-white/95 text-destructive shadow-md outline-none hover:bg-white focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <Trash2 className="size-4" />
          </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border bg-field px-6 text-center transition-colors sm:aspect-[16/9]",
        className,
        "focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15 hover:border-slate-400",
        dragging ? "border-2 border-dashed border-primary bg-primary-soft/40" : "border-input",
        invalid && "border-destructive",
      )}
    >
      {input}
      <ImagePlus className="size-16 text-slate-300" strokeWidth={1.25} aria-hidden />
      <span className="text-xl font-bold tracking-wide text-black/25 sm:text-2xl">
        {dragging ? "Drop the photo here" : "Tap to upload photo"}
      </span>
      <span className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 10 MB · drag & drop works too</span>
    </label>
  );
}
