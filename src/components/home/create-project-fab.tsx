import Link from "next/link";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/** Figma "fab-create-project": sky-600 pill, + icon, bold 14px label, soft sky shadow. */
export function CreateFab({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-[0_8px_10px_rgba(2,132,199,0.2),0_10px_24px_rgba(2,132,199,0.25)] transition-[background-color,transform] outline-none hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-primary/30 sm:right-8 sm:bottom-8",
        className,
      )}
    >
      <Plus className="size-5" strokeWidth={2.5} aria-hidden />
      {label}
    </Link>
  );
}

export function CreateProjectFab() {
  return <CreateFab href="/projects/new" label="Create Project" />;
}
