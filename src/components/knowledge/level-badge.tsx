import { cn } from "@/lib/utils";
import type { KnowledgeLevel } from "@/types/knowledge";

const STYLES: Record<KnowledgeLevel, { label: string; pill: string; dot: string }> = {
  BEGINNER: { label: "Beginner", pill: "bg-green-50 text-green-800", dot: "bg-green-500" },
  INTERMEDIATE: { label: "Intermediate", pill: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  PROFESSIONAL: { label: "Professional", pill: "bg-violet-50 text-violet-800", dot: "bg-violet-500" },
};

/** Figma level pill: tinted capsule with a coloured dot. */
export function LevelBadge({ level, size = "sm", className }: { level: KnowledgeLevel; size?: "sm" | "md"; className?: string }) {
  const s = STYLES[level];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        s.pill,
        className,
      )}
    >
      <span aria-hidden className={cn("rounded-full", size === "sm" ? "size-1.5" : "size-2", s.dot)} />
      {s.label}
    </span>
  );
}

export const levelLabel = (l: KnowledgeLevel) => STYLES[l].label;
