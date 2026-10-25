import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Five stars with fractional fill (e.g. 4.6 → four full + 60% of the fifth), as on the Figma cards. */
export function RatingStars({
  value,
  size = 14,
  className,
}: {
  value: number | null;
  size?: number;
  className?: string;
}) {
  const v = Math.max(0, Math.min(5, value ?? 0));
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={value === null ? "Not rated yet" : `Rated ${v.toFixed(1)} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, v - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-star/35" style={{ width: size, height: size }} strokeWidth={1.75} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="fill-star text-star" style={{ width: size, height: size }} strokeWidth={1.75} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
