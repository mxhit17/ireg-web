import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/admin-gate";
import { EditTopicEditor } from "@/components/knowledge/topic-editor";

export const metadata: Metadata = { title: "Edit topic · Knowledge Base" };

export default async function EditKnowledgeTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slug?: string }>;
}) {
  const [{ id }, { slug }] = await Promise.all([params, searchParams]);
  return (
    <AdminGate
      message="Only admins can edit Knowledge Base topics."
      backHref="/knowledge-base"
      backLabel="Back to Knowledge Base"
    >
      <EditTopicEditor id={id} slug={typeof slug === "string" && slug ? slug : null} />
    </AdminGate>
  );
}
