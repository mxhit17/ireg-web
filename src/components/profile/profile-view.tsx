"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";

import { ProfileShell } from "@/components/profile/profile-shell";
import { ProfileDetailsForm } from "@/components/profile/profile-details-form";
import { ProfileSummary } from "@/components/profile/profile-summary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { patchSessionUser } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { isApiError } from "@/lib/api/errors";
import { getAvatarKey, getAvatarUrl } from "@/lib/api/normalize";

/**
 * Desktop: account menu on the left, profile on the right.
 * Mobile: profile first, then the menu (same order as the Figma profile screen).
 */
export function ProfileView() {
  const profile = useProfile();
  const queryClient = useQueryClient();

  // The header reads the session user; keep its name/photo in step with the fresh profile.
  const user = profile.data;
  useEffect(() => {
    if (!user || user.name === undefined) return;
    const url = getAvatarUrl(user);
    patchSessionUser(queryClient, { name: user.name, ...(url ? { [getAvatarKey(user)]: url } : {}) });
  }, [user, queryClient]);

  return (
    <ProfileShell>
        {profile.isPending ? (
          <ProfileSkeleton />
        ) : profile.isError ? (
          <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <AlertCircle className="size-8 text-destructive" />
            <div>
              <p className="text-lg font-bold">We couldn&apos;t load your profile</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isApiError(profile.error) ? profile.error.message : "Please try again."}
              </p>
            </div>
            <Button onClick={() => profile.refetch()} disabled={profile.isFetching}>
              {profile.isFetching && <Loader2 className="animate-spin" />}
              Try again
            </Button>
          </Card>
        ) : (
          <>
            <ProfileSummary user={profile.data} />
            <ProfileDetailsForm user={profile.data} />
          </>
        )}
    </ProfileShell>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <Card className="overflow-hidden">
        <Skeleton className="h-24 rounded-none sm:h-28" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <Skeleton className="-mt-12 size-24 rounded-full ring-4 ring-white sm:size-28" />
          <div className="grid flex-1 gap-2 pb-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </Card>
      <Card className="grid gap-5 p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </Card>
    </>
  );
}
