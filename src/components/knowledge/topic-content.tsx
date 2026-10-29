import { Info, Lightbulb } from "lucide-react";

import { LevelBadge } from "@/components/knowledge/level-badge";
import type { KnowledgeLevel, KnowledgeTag } from "@/types/knowledge";

/** Figma "Important:" box shown on every topic. */
export const KB_DISCLAIMER =
  "Information provided by IREG is for general educational purposes and should not be treated as legal, tax, financial or professional advice. Rules, fees, procedures and terminology may vary by state and may change over time. Verify current requirements with the relevant government authority or qualified professional.";

/**
 * Figma "knowledge-base-info-screen" body: level + tag pills, title, disclaimer, Definition card,
 * "In simple words" card. Shared by the topic page and the admin editor's live preview.
 */
export function TopicContent({
  title,
  level,
  tags = [],
  categoryName,
  definition,
  simpleExplanation,
  as: Heading = "h1",
}: {
  title: string;
  level: KnowledgeLevel;
  tags?: KnowledgeTag[];
  categoryName?: string | null;
  definition: string;
  simpleExplanation: string | null;
  as?: "h1" | "h2";
}) {
  return (
    <article className="grid gap-4">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <LevelBadge level={level} size="md" />
          {categoryName && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-slate-600">{categoryName}</span>
          )}
          {tags.map((t) => (
            <span key={t.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-slate-600">
              {t.name}
            </span>
          ))}
        </div>
        <Heading className="text-2xl leading-tight font-bold tracking-tight break-words sm:text-[1.75rem]">
          {title || <span className="text-subtle-foreground">Untitled topic</span>}
        </Heading>
      </header>

      <aside className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] leading-relaxed text-amber-950">
        <Info className="mt-0.5 size-[18px] shrink-0 text-amber-600" aria-hidden />
        <p>
          <span className="font-bold">Important:</span> {KB_DISCLAIMER}
        </p>
      </aside>

      <section className="rounded-xl border border-border bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold">Definition</h2>
        <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-slate-700">
          {definition || <span className="text-subtle-foreground">No definition yet.</span>}
        </p>
      </section>

      {simpleExplanation && (
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-accent-foreground">
            <Lightbulb className="size-[18px]" aria-hidden /> In simple words
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-line text-slate-700">{simpleExplanation}</p>
        </section>
      )}
    </article>
  );
}
