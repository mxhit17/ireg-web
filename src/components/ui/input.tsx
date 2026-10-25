import * as React from "react";

import { cn } from "@/lib/utils";

/** Field style follows the Figma form inputs: #f8f9fa fill, #d9d9d9 border, 8px radius. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full min-w-0 rounded-lg border border-input bg-field px-4 text-[15px] text-foreground transition-[color,box-shadow,border-color] outline-none",
        "placeholder:text-subtle-foreground selection:bg-primary selection:text-primary-foreground",
        "focus-visible:border-primary focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-primary/15",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/15",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
