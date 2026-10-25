"use client";

import { queryOptions, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getProjectById,
  getProjectRatings,
  getTopDiscussions,
  searchProjects,
  type SearchParams,
} from "@/lib/api/projects";

export const PAGE_SIZE = 12;

export const projectKeys = {
  all: ["projects"] as const,
  search: (params: SearchParams) => [...projectKeys.all, "search", params] as const,
  detail: (id: string) => [...projectKeys.all, id] as const,
  ratings: (id: string) => [...projectKeys.all, id, "ratings"] as const,
  topDiscussions: (id: string) => [...projectKeys.all, id, "top-discussions"] as const,
};

export function useProjectSearch(params: SearchParams, enabled = true) {
  return useInfiniteQuery({
    queryKey: projectKeys.search(params),
    queryFn: ({ pageParam }) => searchProjects({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.next ?? undefined,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useProject(id: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProjectById(id),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export const projectRatingsQuery = (id: string) =>
  queryOptions({
    queryKey: projectKeys.ratings(id),
    queryFn: () => getProjectRatings(id),
    staleTime: 5 * 60 * 1000,
  });

/** `enabled` lets cards defer the request until they scroll into view. */
export function useProjectRatings(id: string, enabled = true) {
  return useQuery({ ...projectRatingsQuery(id), enabled });
}

export function useTopDiscussions(id: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.topDiscussions(id),
    queryFn: () => getTopDiscussions(id),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
