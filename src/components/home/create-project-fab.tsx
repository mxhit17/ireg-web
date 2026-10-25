import Link from "next/link";
import { Plus } from "lucide-react";

/** Figma "fab-create-project": sky-600 pill, + icon, bold 14px label, soft sky shadow. */
export function CreateProjectFab() {
  return (
    <Link
      href="/projects/new"
      className="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-[0_8px_10px_rgba(2,132,199,0.2),0_10px_24px_rgba(2,132,199,0.25)] transition-[background-color,transform] outline-none hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-primary/30 sm:right-8 sm:bottom-8"
    >
      <Plus className="size-5" strokeWidth={2.5} aria-hidden />
      Create Project
    </Link>
  );
}
