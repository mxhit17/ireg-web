import type { Metadata } from "next";
import { Compass } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Knowledge Base" };

export default function KnowledgeBasePage() {
  return (
    <ComingSoon
      icon={Compass}
      title="Knowledge Base"
      description="Plain-language guides to the technical side of buying property."
      points={[
        "Basic real estate terms — earnest money, allottee, resale property",
        "Property size and measurement",
        "Land records, revenue records and offices",
      ]}
    />
  );
}
