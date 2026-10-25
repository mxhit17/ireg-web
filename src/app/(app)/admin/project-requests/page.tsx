import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/admin-gate";
import { RequestQueue } from "@/components/admin/request-queue";

export const metadata: Metadata = { title: "Project requests" };

export default function AdminProjectRequestsPage() {
  return (
    <AdminGate>
      <div className="mx-auto grid max-w-3xl gap-5">
        <div>
          <p className="text-xs font-bold tracking-wider text-primary uppercase">Admin</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">Project requests</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Projects users have asked to add. Verify there&apos;s no duplicate, then approve or reject.
          </p>
        </div>
        <RequestQueue />
      </div>
    </AdminGate>
  );
}
