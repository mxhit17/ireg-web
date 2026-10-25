import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Placeholder for tabs whose pages haven't been built yet, so the tab bar never 404s. */
export function ComingSoon({
  icon: Icon,
  title,
  description,
  points,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  points?: string[];
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-border bg-white px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="size-7" aria-hidden />
      </span>
      <div>
        <p className="text-xs font-bold tracking-wider text-subtle-foreground uppercase">Coming soon</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{description}</p>
      </div>
      {points && (
        <ul className="grid gap-1.5 text-left text-sm text-slate-600">
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {p}
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="outline" className="mt-2">
        <Link href="/">Back to threads</Link>
      </Button>
    </div>
  );
}
