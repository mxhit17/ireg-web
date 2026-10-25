"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, MapPin } from "lucide-react";

import { ProjectThumb } from "@/components/projects/project-card";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useProjectSearch } from "@/hooks/use-projects";
import { formatProjectLocation } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Looks up existing projects matching `query` (GET projects/search). Used on the request form
 * ("already on IREG?") and by admins on the Figma "Verify" step to spot duplicates.
 */
export function SimilarProjects({
  query,
  variant = "hint",
  className,
}: {
  query: string;
  variant?: "hint" | "verify";
  className?: string;
}) {
  const q = useDebouncedValue(query.trim(), 400);
  const enabled = q.length >= 3;
  const search = useProjectSearch({ q }, enabled);
  const items = (search.data?.pages[0]?.items ?? []).slice(0, 5);

  if (!enabled) {
    return variant === "verify" ? (
      <p className={cn("text-sm text-muted-foreground", className)}>Type at least 3 characters to search.</p>
    ) : null;
  }

  if (search.isPending) {
    return (
      <p className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="size-4 animate-spin" /> Checking existing projects…
      </p>
    );
  }

  if (items.length === 0) {
    return variant === "verify" ? (
      <p className={cn("flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-800", className)}>
        <CheckCircle2 className="size-4 shrink-0" /> No existing project matches “{q}”.
      </p>
    ) : null;
  }

  return (
    <div
      className={cn(
        "grid gap-2 rounded-xl border p-3",
        variant === "hint" ? "border-amber-200 bg-amber-50" : "border-border bg-white",
        className,
      )}
    >
      <p className={cn("flex items-center gap-2 text-sm font-semibold", variant === "hint" && "text-amber-900")}>
        <AlertTriangle className="size-4 shrink-0" />
        {variant === "hint"
          ? "Is it one of these? It may already be on IREG."
          : `${items.length}${search.hasNextPage ? "+" : ""} existing project${items.length === 1 ? "" : "s"} match “${q}”`}
      </p>
      <ul className="grid gap-1.5">
        {items.map((p) => (
          <li key={p.id}>
            <Link
              href={`/projects/${p.id}`}
              target="_blank"
              className="flex items-center gap-3 rounded-lg bg-white p-2 outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <ProjectThumb src={p.imageUrl} className="size-10" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                {formatProjectLocation(p) && (
                  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" /> {formatProjectLocation(p)}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
