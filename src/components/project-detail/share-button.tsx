"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/** Native share sheet where available (mobile), otherwise copies the link. */
export function ShareButton({
  title,
  className,
  label = "Share this project",
  text = `See what people are saying about ${title} on IREG`,
}: {
  title: string;
  className?: string;
  label?: string;
  text?: string;
}) {
  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${title} · IREG`, text, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // user closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={label}
      title="Share"
      className={cn(
        "inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-border px-2.5 text-foreground transition-colors outline-none hover:bg-slate-300 focus-visible:ring-[3px] focus-visible:ring-ring/40",
        className,
      )}
    >
      <Share2 className="size-4" aria-hidden />
    </button>
  );
}
