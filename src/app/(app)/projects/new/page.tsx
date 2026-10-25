import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CreateRequestForm } from "@/components/project-requests/create-request-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Create a project" };

export default function NewProjectRequestPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to threads
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">Create a project</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Can&apos;t find a project on IREG? Tell us about it and we&apos;ll add it after review.
          </p>
        </div>
        <Link href="/projects/requests" className="text-sm font-semibold text-primary hover:underline">
          My requests
        </Link>
      </div>
      <Card className="p-5 sm:p-6">
        <CreateRequestForm />
      </Card>
    </div>
  );
}
