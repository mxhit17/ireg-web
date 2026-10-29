import type { Metadata } from "next";

import { CategoryView } from "@/components/knowledge/category-view";

export const metadata: Metadata = { title: "Knowledge Base" };

export default async function KnowledgeCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return <CategoryView slug={decodeURIComponent(category)} />;
}
