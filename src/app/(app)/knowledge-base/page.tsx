import type { Metadata } from "next";
import { Suspense } from "react";

import { KnowledgeBaseHome } from "@/components/knowledge/kb-home";

export const metadata: Metadata = { title: "Knowledge Base" };

export default function KnowledgeBasePage() {
  return (
    <Suspense>
      <KnowledgeBaseHome />
    </Suspense>
  );
}
