import Link from "next/link";
import { Building } from "lucide-react";

import { cn } from "@/lib/utils";

/** App-bar brand from the Figma design: 28px sky-600 badge with a building glyph + ExtraBold wordmark. */
export function Logo({
  className,
  variant = "default",
  short = false,
  href = "/",
}: {
  className?: string;
  variant?: "default" | "inverted";
  short?: boolean;
  href?: string | null;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          variant === "inverted" ? "bg-white text-primary" : "bg-primary text-white",
        )}
      >
        <Building className="size-4" strokeWidth={2.25} aria-hidden />
      </span>
      <span
        className={cn(
          "text-lg font-extrabold tracking-tight whitespace-nowrap",
          variant === "inverted" ? "text-white" : "text-foreground",
        )}
      >
        {short ? "IREG" : "Indian Real Estate Guide"}
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="IREG home" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40">
      {content}
    </Link>
  );
}
