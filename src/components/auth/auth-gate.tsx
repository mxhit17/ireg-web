"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, WifiOff } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-auth";
import { LOGIN_ROUTE } from "@/lib/auth/constants";

/**
 * Wraps signed-in areas. Restores the session on load (spinner meanwhile), sends
 * signed-out users to /login?next=…, and shows a retry screen if the server is unreachable
 * (instead of logging people out because of a network blip).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const signedOut = session.isSuccess && !session.data;

  useEffect(() => {
    if (signedOut) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`${LOGIN_ROUTE}${next}`);
    }
  }, [signedOut, pathname, router]);

  if (session.isError) {
    return (
      <FullScreen>
        <WifiOff className="size-8 text-subtle-foreground" aria-hidden />
        <div className="text-center">
          <p className="text-lg font-bold">Can&apos;t reach IREG right now</p>
          <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
        </div>
        <Button onClick={() => session.refetch()} disabled={session.isFetching}>
          {session.isFetching && <Loader2 className="animate-spin" />}
          Try again
        </Button>
      </FullScreen>
    );
  }

  if (session.isPending || signedOut) {
    return (
      <FullScreen>
        <Logo href={null} />
        <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading your account" />
      </FullScreen>
    );
  }

  return <>{children}</>;
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6">{children}</div>;
}
