import type { Metadata } from "next";

import { FeedbackForm } from "@/components/feedback/feedback-form";
import { ProfileShell } from "@/components/profile/profile-shell";

export const metadata: Metadata = { title: "Feedback" };

export default function FeedbackPage() {
  return (
    <ProfileShell>
      <FeedbackForm />
    </ProfileShell>
  );
}
