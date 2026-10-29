"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isApiError } from "@/lib/api/errors";
import {
  createKnowledgeCategory,
  createKnowledgeTopic,
  getCategoryTopics,
  getKnowledgeCategories,
  getKnowledgeTopic,
  publishKnowledgeTopic,
  searchKnowledgeTopics,
  updateKnowledgeTopic,
} from "@/lib/api/knowledge";
import { knowledgeDrafts } from "@/lib/knowledge-drafts";
import type { CategoryInput, KnowledgeTopic, TopicInput } from "@/types/knowledge";

export const kbKeys = {
  all: ["knowledge"] as const,
  categories: ["knowledge", "categories"] as const,
  category: (slug: string) => ["knowledge", "category", slug] as const,
  topic: (slug: string) => ["knowledge", "topic", slug] as const,
  search: (q: string) => ["knowledge", "search", q] as const,
};

const errMsg = (err: unknown, fallback: string) => (isApiError(err) ? err.message : fallback);

// Knowledge content changes rarely — cache generously.
const STALE = 10 * 60 * 1000;

export function useKnowledgeCategories() {
  return useQuery({ queryKey: kbKeys.categories, queryFn: getKnowledgeCategories, staleTime: STALE });
}

export function useCategoryTopics(slug: string) {
  return useQuery({
    queryKey: kbKeys.category(slug),
    queryFn: () => getCategoryTopics(slug),
    enabled: slug.length > 0,
    staleTime: STALE,
  });
}

export function useKnowledgeTopic(slug: string | null) {
  return useQuery({
    queryKey: kbKeys.topic(slug ?? ""),
    queryFn: () => getKnowledgeTopic(slug!),
    enabled: !!slug,
    staleTime: STALE,
  });
}

export function useKnowledgeSearch(q: string) {
  return useQuery({
    queryKey: kbKeys.search(q),
    queryFn: () => searchKnowledgeTopics(q),
    enabled: q.length > 0,
    staleTime: 60 * 1000,
  });
}

/** Drafts remembered in this browser (see lib/knowledge-drafts.ts). */
export function useLocalDrafts() {
  const [drafts, setDrafts] = useState<KnowledgeTopic[]>([]);
  useEffect(() => {
    setDrafts(knowledgeDrafts.list());
    return knowledgeDrafts.subscribe(() => setDrafts(knowledgeDrafts.list()));
  }, []);
  return drafts;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => createKnowledgeCategory(input),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: kbKeys.categories });
      toast.success(`Category “${cat?.name ?? "new category"}” created`);
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't create the category.")),
  });
}

/** After any topic write: refresh lists + the topic page, and keep the local draft index in sync. */
function afterTopicWrite(qc: ReturnType<typeof useQueryClient>, topic: KnowledgeTopic | null, oldSlug?: string) {
  if (topic) knowledgeDrafts.remember(topic);
  qc.invalidateQueries({ queryKey: kbKeys.all });
  if (oldSlug && topic && oldSlug !== topic.slug) qc.removeQueries({ queryKey: kbKeys.topic(oldSlug) });
}

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TopicInput) => createKnowledgeTopic(input),
    onSuccess: (topic, input) => {
      afterTopicWrite(qc, topic);
      toast.success(input.status === "PUBLISHED" ? "Topic published" : "Draft saved");
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't create the topic.")),
  });
}

export function useUpdateTopic(id: string, oldSlug?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<TopicInput>) => updateKnowledgeTopic(id, input),
    onSuccess: (topic, input) => {
      afterTopicWrite(qc, topic, oldSlug);
      toast.success(
        input.status === "DRAFT" ? "Moved back to drafts" : input.status === "PUBLISHED" ? "Topic published" : "Changes saved",
      );
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't save the topic.")),
  });
}

export function usePublishTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishKnowledgeTopic(id),
    onSuccess: (topic, id) => {
      if (topic) knowledgeDrafts.remember(topic);
      else knowledgeDrafts.forget(id);
      qc.invalidateQueries({ queryKey: kbKeys.all });
      toast.success("Topic published — it's now visible to everyone");
    },
    onError: (err) => toast.error(errMsg(err, "Couldn't publish the topic.")),
  });
}
