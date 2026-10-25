"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/** Figma "search-btn": 52px tall, 18px radius, slate-200 border, icon on the right. */
export function ProjectSearchBar({
  value,
  onSearch,
  className,
}: {
  value: string;
  onSearch: (q: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(draft.trim());
      }}
    >
      <label htmlFor="project-search" className="sr-only">
        Search projects
      </label>
      <input
        id="project-search"
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Explore more exciting projects"
        autoComplete="off"
        enterKeyHint="search"
        className="h-[52px] w-full rounded-[18px] border border-border bg-white pr-24 pl-5 text-base font-semibold text-foreground shadow-[0_4px_12px_rgba(15,23,42,0.03)] transition-[border-color,box-shadow] outline-none placeholder:font-semibold placeholder:text-black/25 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {draft && (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              onSearch("");
            }}
            aria-label="Clear search"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full text-subtle-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          type="submit"
          aria-label="Search"
          className="flex size-9 cursor-pointer items-center justify-center rounded-full text-foreground outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <Search className="size-[18px]" />
        </button>
      </div>
    </form>
  );
}
