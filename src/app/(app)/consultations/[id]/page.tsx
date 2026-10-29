import type { Metadata } from "next";

import { ConsultationDetail } from "@/components/consultations/consultation-detail";

export const metadata: Metadata = { title: "Consultation" };

export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConsultationDetail id={id} />;
}
