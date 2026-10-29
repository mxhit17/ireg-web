import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/admin-gate";
import { NewTopicEditor } from "@/components/knowledge/topic-editor";

export const metadata: Metadata = { title: "New topic · Knowledge Base" };

export default async function NewKnowledgeTopicPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return (
    <AdminGate
      message="Only admins can write Knowledge Base topics."
      backHref="/knowledge-base"
      backLabel="Back to Knowledge Base"
    >
      <NewTopicEditor defaultCategoryId={typeof category === "string" ? category : undefined} />
    </AdminGate>
  );
}
