import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/admin-gate";
import { AdminFeedbackView } from "@/components/feedback/admin-feedback";

export const metadata: Metadata = { title: "Feedback responses" };

export default function AdminFeedbackPage() {
  return (
    <AdminGate message="Only admins can read feedback responses." backHref="/feedback" backLabel="Back to Feedback">
      <AdminFeedbackView />
    </AdminGate>
  );
}
