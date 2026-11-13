import Link from "next/link";

import { cn } from "@/lib/utils";

export const SLOGAN = "Real People. Real Reviews. Trusted Decisions.";

const SIZES = {
  md: { mark: "h-9 lg:h-10", title: "text-[13px] sm:text-[15px] lg:text-base", slogan: "text-[9.5px] sm:text-[10.5px]" },
  lg: { mark: "h-14", title: "text-xl", slogan: "text-[13px]" },
};

/**
 * IREG brand: the IREG mark (from the official logo) with "Indian Real Estate Guide" and the
 * slogan underneath. `inverted` uses the white mark for dark/blue backgrounds.
 */
export function Logo({
  className,
  variant = "default",
  size = "md",
  short = false,
  tagline = true,
  href = "/",
}: {
  className?: string;
  variant?: "default" | "inverted";
  size?: keyof typeof SIZES;
  /** Mark only. */
  short?: boolean;
  tagline?: boolean;
  href?: string | null;
}) {
  const s = SIZES[size];
  const inverted = variant === "inverted";
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={inverted ? "/brand/ireg-mark-white.png" : "/brand/ireg-mark.png"}
        alt={short ? "IREG" : ""}
        width={410}
        height={240}
        className={cn("w-auto shrink-0", s.mark)}
      />
      {!short && (
        <span className="grid min-w-0 leading-tight">
          <span
            className={cn(
              "font-extrabold tracking-tight whitespace-nowrap",
              s.title,
              inverted ? "text-white" : "text-[#13285a]",
            )}
          >
            Indian Real Estate Guide
          </span>
          {tagline && (
            <span
              className={cn(
                "mt-0.5 font-semibold whitespace-nowrap",
                s.slogan,
                inverted ? "text-sky-100" : "text-muted-foreground",
              )}
            >
              {SLOGAN}
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="IREG home" className="min-w-0 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40">
      {content}
    </Link>
  );
}
