import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminGate } from "@/components/admin/admin-gate";
import { RequestReview } from "@/components/admin/request-review";

export const metadata: Metadata = { title: "Review project request" };

export default async function ReviewProjectRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminGate>
      <div className="mx-auto grid max-w-2xl gap-5">
        <Link
          href="/admin/project-requests"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> All requests
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Review request</h1>
        <RequestReview id={id} />
      </div>
    </AdminGate>
  );
}
