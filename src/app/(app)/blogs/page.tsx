import type { Metadata } from "next";
import { Suspense } from "react";

import { BlogsHome } from "@/components/blogs/blogs-home";

export const metadata: Metadata = { title: "Blogs" };

export default function BlogsPage() {
  return (
    <Suspense>
      <BlogsHome />
    </Suspense>
  );
}
