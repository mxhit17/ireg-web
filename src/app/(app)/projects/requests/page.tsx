import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

import { MyRequestsList } from "@/components/project-requests/my-requests-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My project requests" };

export default function MyProjectRequestsPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to threads
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">My project requests</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">Projects you&apos;ve asked us to add, and where they stand.</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus /> Create Project
          </Link>
        </Button>
      </div>
      <MyRequestsList />
    </div>
  );
}
