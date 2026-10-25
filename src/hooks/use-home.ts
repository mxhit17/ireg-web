"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getHome, getSavedProjects, saveProject, unsaveProject } from "@/lib/api/home";
import { isApiError } from "@/lib/api/errors";
import type { ProjectSummary, SavedProject } from "@/types/project";

export const HOME_PAGE_SIZE = 6;

export const homeKeys = {
  home: ["home"] as const,
  saved: ["saved-projects"] as const,
};

/**
 * GET home, page by page. One page carries both sections, so "Show more" on either section
 * fetches the next page and each section appends its own items.
 */
export function useHome() {
  return useInfiniteQuery({
    queryKey: homeKeys.home,
    queryFn: ({ pageParam }) => getHome({ page: pageParam, limit: HOME_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.recent.hasNextPage || last.pagination.popular.hasNextPage ? last.page + 1 : undefined,
    staleTime: 60 * 1000,
  });
}

export function useSavedProjects() {
  return useQuery({
    queryKey: homeKeys.saved,
    queryFn: getSavedProjects,
    staleTime: 60 * 1000,
  });
}

/** Whether a project is in the user's saved list (source of truth: the saved-projects query). */
export function useIsSaved(projectId: string) {
  const saved = useSavedProjects();
  return !!saved.data?.some((p) => p.id === projectId);
}

interface ToggleVars {
  project: Pick<ProjectSummary, "id" | "name" | "slug" | "type">;
  save: boolean;
}

/**
 * Save / unsave with an optimistic update of the saved list, so bookmarks flip instantly.
 * The home sections aren't refetched immediately (the API moves saved projects out of
 * "Recent"), so the card the user just clicked doesn't jump away; the next visit reflects it.
 */
export function useToggleSave() {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, ToggleVars, { previous?: SavedProject[] }>({
    mutationFn: ({ project, save }) => (save ? saveProject(project.id) : unsaveProject(project.id)),
    onMutate: async ({ project, save }) => {
      await queryClient.cancelQueries({ queryKey: homeKeys.saved });
      const previous = queryClient.getQueryData<SavedProject[]>(homeKeys.saved);
      queryClient.setQueryData<SavedProject[]>(homeKeys.saved, (old = []) =>
        save
          ? [
              {
                id: project.id,
                name: project.name,
                slug: project.slug,
                description: null,
                type: project.type,
                savedAt: new Date().toISOString(),
              },
              ...old.filter((p) => p.id !== project.id),
            ]
          : old.filter((p) => p.id !== project.id),
      );
      return { previous };
    },
    onError: (err, { save }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(homeKeys.saved, ctx.previous);
      toast.error(isApiError(err) ? err.message : save ? "Couldn't save this project." : "Couldn't remove it.");
    },
    onSuccess: (_d, { save, project }) => {
      if (save) {
        toast.success(`Saved “${project.name}”`);
      } else {
        toast.success(`Removed “${project.name}” from saved`, {
          action: { label: "Undo", onClick: () => mutation.mutate({ project, save: true }) },
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: homeKeys.saved });
    },
  });

  return mutation;
}
