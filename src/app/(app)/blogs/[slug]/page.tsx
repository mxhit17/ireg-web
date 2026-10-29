import type { Metadata } from "next";

import { BlogArticle } from "@/components/blogs/blog-article";

export const metadata: Metadata = { title: "Blogs" };

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlogArticle slug={decodeURIComponent(slug)} />;
}
