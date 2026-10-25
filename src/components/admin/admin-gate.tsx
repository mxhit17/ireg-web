"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/api/normalize";

/** Hides admin screens from non-admins (the API enforces ADMIN too). */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  if (isAdmin(user)) return <>{children}</>;
  return (
    <Card className="mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-14 text-center">
      <ShieldAlert className="size-8 text-subtle-foreground" />
      <p className="text-lg font-bold">Admins only</p>
      <p className="text-sm text-muted-foreground">You need an admin account to review project requests.</p>
      <Button asChild variant="outline" className="mt-1">
        <Link href="/">Back to threads</Link>
      </Button>
    </Card>
  );
}
