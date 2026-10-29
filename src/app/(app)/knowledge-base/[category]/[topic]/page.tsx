import type { Metadata } from "next";

import { TopicView } from "@/components/knowledge/topic-view";

export const metadata: Metadata = { title: "Knowledge Base" };

export default async function KnowledgeTopicPage({ params }: { params: Promise<{ category: string; topic: string }> }) {
  const { category, topic } = await params;
  return <TopicView categorySlug={decodeURIComponent(category)} topicSlug={decodeURIComponent(topic)} />;
}
