import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/admin-gate";
import { AdminConsultations } from "@/components/consultations/admin-consultations";

export const metadata: Metadata = { title: "Manage consultations" };

export default function AdminConsultationsPage() {
  return (
    <AdminGate message="Only admins can manage consultations." backHref="/consultations" backLabel="Back to Consultation">
      <AdminConsultations />
    </AdminGate>
  );
}
