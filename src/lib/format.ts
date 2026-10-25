import type { ProjectStatus, ProjectSummary, ProjectType } from "@/types/project";

/** ₹ in Indian units: 7500000 → "₹75 L", 15000000 → "₹1.5 Cr", 85000 → "₹85K". */
export function formatINRCompact(value: number): string {
  const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, ""));
  if (value >= 1e7) return `₹${trim(value / 1e7)} Cr`;
  if (value >= 1e5) return `₹${trim(value / 1e5)} L`;
  if (value >= 1e3) return `₹${trim(value / 1e3)}K`;
  return `₹${value}`;
}

export function formatPriceRange(min: number | null, max: number | null): string | null {
  if (min && max) return min === max ? formatINRCompact(min) : `${formatINRCompact(min)} – ${formatINRCompact(max)}`;
  if (min) return `From ${formatINRCompact(min)}`;
  if (max) return `Up to ${formatINRCompact(max)}`;
  return null;
}

/** "Whitefield, Bengaluru" — falls back through locality → location → city → state. */
export function formatProjectLocation(p: Pick<ProjectSummary, "locality" | "location" | "city" | "state">): string | null {
  const area = p.locality ?? p.location;
  const parts = [area, p.city ?? p.state].filter(Boolean) as string[];
  return parts.length ? Array.from(new Set(parts)).join(", ") : null;
}

const TYPE_LABEL: Record<ProjectType, string> = {
  APARTMENT: "Apartment",
  VILLA: "Villa",
  PLOT: "Plot",
  BUILDER_FLOOR: "Builder floor",
  COMMERCIAL: "Commercial",
  TOWNSHIP: "Township",
  OTHER: "Other",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  UPCOMING: "Upcoming",
  ONGOING: "Under construction",
  COMPLETED: "Ready to move",
  SOLD_OUT: "Sold out",
  UNKNOWN: "",
};

export const projectTypeLabel = (t: ProjectType | null) => (t ? TYPE_LABEL[t] ?? t : null);
export const projectStatusLabel = (s: ProjectStatus | null) => (s ? STATUS_LABEL[s] || null : null);

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** "just now", "2h ago", "3d ago", then a date — matches the Figma "• 2h ago" style. */
export function timeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.round((now - t) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.round(d / 7)}w ago`;
  return shortDate.format(t);
}

export function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);
}
