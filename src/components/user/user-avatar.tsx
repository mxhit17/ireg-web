"use client";

import { useState } from "react";

import { getAvatarUrl } from "@/lib/api/normalize";
import { cn } from "@/lib/utils";
import type { User } from "@/types/auth";

export function getInitials(name?: string | null) {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Round avatar: the user's photo, or their initials on a sky tint if there's no photo (or it fails to load). */
export function UserAvatar({
  user,
  className,
}: {
  user: Pick<User, "name"> & Partial<User>;
  className?: string;
}) {
  const src = getAvatarUrl(user);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!src && failedSrc !== src;

  return (
    <span
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-bold text-primary select-none",
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span aria-hidden>{getInitials(user.name) || "?"}</span>
      )}
      <span className="sr-only">{user.name}</span>
    </span>
  );
}
