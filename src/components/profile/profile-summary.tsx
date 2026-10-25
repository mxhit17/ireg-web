import { CalendarDays, Mail, ShieldCheck } from "lucide-react";

import { ProfilePhoto } from "@/components/profile/profile-photo";
import { Card } from "@/components/ui/card";
import { getCreatedAt, isAdmin } from "@/lib/api/normalize";
import type { User } from "@/types/auth";

const memberSince = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

/** Web take on the Figma profile header (96px photo + name), with email and meta added. */
export function ProfileSummary({ user }: { user: User }) {
  const createdAt = getCreatedAt(user);
  const admin = isAdmin(user);

  return (
    <Card className="overflow-hidden">
      <div aria-hidden className="h-24 bg-gradient-to-r from-sky-500 via-primary to-sky-700 sm:h-28" />
      <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:gap-6">
        <ProfilePhoto user={user} className="-mt-12 sm:-mt-14" />
        <div className="min-w-0 flex-1 sm:pb-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{user.name}</h1>
            {admin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                <ShieldCheck className="size-3.5" /> Admin
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail className="size-4 shrink-0" />
              <span className="truncate">{user.email}</span>
            </span>
            {createdAt && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 shrink-0" />
                Member since {memberSince.format(createdAt)}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-subtle-foreground sm:pb-1.5 sm:text-right">
          <span className="sm:block">Click your photo to change it</span>
          <span className="sm:hidden"> · </span>
          <span className="sm:block">JPG, PNG or WebP</span>
        </p>
      </div>
    </Card>
  );
}
