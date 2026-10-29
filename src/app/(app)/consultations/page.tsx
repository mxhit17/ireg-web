import type { Metadata } from "next";

import { ConsultationsHome } from "@/components/consultations/consultations-home";

export const metadata: Metadata = { title: "Consultation" };

export default function ConsultationsPage() {
  return <ConsultationsHome />;
}
