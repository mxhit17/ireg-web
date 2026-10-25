import type { Metadata } from "next";

import { ProfileShell } from "@/components/profile/profile-shell";
import { SavedProjectsView } from "@/components/profile/saved-projects-view";

export const metadata: Metadata = { title: "Saved projects" };

export default function SavedProjectsPage() {
  return (
    <ProfileShell>
      <SavedProjectsView />
    </ProfileShell>
  );
}
