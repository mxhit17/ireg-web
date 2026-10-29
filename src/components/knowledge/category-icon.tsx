import {
  BookOpen,
  Building,
  Building2,
  FileText,
  HardHat,
  House,
  Landmark,
  LibraryBig,
  Map as MapIcon,
  Ruler,
  Scale,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Categories have no image in the API, so the Figma thumbnail becomes a tinted icon tile —
 * the icon is picked from keywords in the category name, the tint is stable per slug.
 */
const RULES: [RegExp, LucideIcon][] = [
  [/measure|size|area|sq/i, Ruler],
  [/land|plot/i, MapIcon],
  [/revenue|record|office|registr/i, Landmark],
  [/legal|law|rera|agreement/i, Scale],
  [/construct|build(ing)? stage/i, HardHat],
  [/villa|house|home/i, House],
  [/apartment|flat/i, Building2],
  [/type/i, Building],
  [/document|paper/i, FileText],
  [/basic|term|glossary|vocab/i, BookOpen],
];

const TINTS = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function CategoryIcon({ name, slug, className }: { name: string; slug: string; className?: string }) {
  const Icon = RULES.find(([re]) => re.test(name))?.[1] ?? LibraryBig;
  return (
    <span
      aria-hidden
      className={cn("flex size-14 shrink-0 items-center justify-center rounded-xl", TINTS[hash(slug || name) % TINTS.length], className)}
    >
      <Icon className="size-7" strokeWidth={1.75} />
    </span>
  );
}
