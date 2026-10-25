import type { Metadata } from "next";
import { Bookmark } from "lucide-react";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Consultation" };

export default function ConsultationsPage() {
  return (
    <ComingSoon
      icon={Bookmark}
      title="Consultation"
      description="Book a lawyer, CA or banker and chat with them about your purchase."
      points={[
        "An expert connects with you over chat within 24–48 hours",
        "The chat stays open for 7 days",
        "You're notified whenever they reply",
      ]}
    />
  );
}
