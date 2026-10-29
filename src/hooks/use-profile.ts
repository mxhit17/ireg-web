"use client";

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { patchSessionUser } from "@/hooks/use-auth";
import { getAvatarKey, getAvatarUrl } from "@/lib/api/normalize";
import { getProfile, updateProfile, uploadProfilePhoto, type UpdateProfileInput } from "@/lib/api/profile";
import type { User } from "@/types/auth";

export const profileQuery = queryOptions({
  queryKey: ["profile", "me"] as const,
  queryFn: getProfile,
  staleTime: 5 * 60 * 1000,
});

export function useProfile() {
  return useQuery(profileQuery);
}

/** PATCH profile/name. Keeps the profile query and the header's session user in sync. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (updated, input) => {
      const current = queryClient.getQueryData(profileQuery.queryKey);
      const next: User | undefined = updated ?? (current ? { ...current, ...input } : undefined);
      if (next) queryClient.setQueryData(profileQuery.queryKey, next);
      const patch: Partial<User> = {};
      if (input.name !== undefined) patch.name = next?.name ?? input.name;
      if (input.phone !== undefined) patch.phone = next?.phone ?? input.phone;
      patchSessionUser(queryClient, patch);
      toast.success("Profile updated");
    },
  });
}

interface PhotoContext {
  previous?: User;
  previewUrl: string;
}

/**
 * PATCH profile/photo with optimistic preview: the new picture shows immediately and is
 * rolled back if the upload fails.
 */
export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();

  return useMutation<Awaited<ReturnType<typeof uploadProfilePhoto>>, Error, File, PhotoContext>({
    mutationFn: (file) => uploadProfilePhoto(file),
    onMutate: async (file) => {
      await queryClient.cancelQueries({ queryKey: profileQuery.queryKey });
      const previous = queryClient.getQueryData(profileQuery.queryKey);
      const previewUrl = URL.createObjectURL(file);
      if (previous) {
        queryClient.setQueryData(profileQuery.queryKey, {
          ...previous,
          [getAvatarKey(previous)]: previewUrl,
        });
      }
      return { previous, previewUrl };
    },
    onError: (_err, _file, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(profileQuery.queryKey, ctx.previous);
    },
    onSuccess: ({ user, imageUrl }, _file, ctx) => {
      const base = user ?? ctx?.previous;
      if (base && imageUrl) {
        const key = getAvatarKey(base);
        const next = { ...base, [key]: imageUrl };
        queryClient.setQueryData(profileQuery.queryKey, next);
        patchSessionUser(queryClient, { [key]: imageUrl });
      } else {
        // Response didn't include the URL — fetch the fresh profile instead.
        queryClient.invalidateQueries({ queryKey: profileQuery.queryKey }).then(() => {
          const fresh = queryClient.getQueryData(profileQuery.queryKey);
          const url = getAvatarUrl(fresh);
          if (fresh && url) patchSessionUser(queryClient, { [getAvatarKey(fresh)]: url });
        });
      }
      toast.success("Profile photo updated");
    },
    onSettled: (_data, _err, _file, ctx) => {
      // Give the <img> a moment to switch to the real URL before freeing the preview.
      if (ctx?.previewUrl) setTimeout(() => URL.revokeObjectURL(ctx.previewUrl), 5000);
    },
  });
}
