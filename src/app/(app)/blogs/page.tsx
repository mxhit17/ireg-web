import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Blogs" };

export default function BlogsPage() {
  return (
    <ComingSoon
      icon={MessageSquare}
      title="Blogs"
      description="The latest real estate news and analysis, curated by the IREG team."
    />
  );
}
