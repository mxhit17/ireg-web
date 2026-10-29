import type { Metadata } from "next";

import { BookConsultation } from "@/components/consultations/book-consultation";

export const metadata: Metadata = { title: "Book a consultation" };

export default async function BookConsultationPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  return <BookConsultation serviceId={serviceId} />;
}
