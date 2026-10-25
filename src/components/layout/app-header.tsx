"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { DesktopNav, MobileTabBar } from "@/components/layout/app-nav";
import { UserAvatar } from "@/components/user/user-avatar";
import { useCurrentUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/**
 * Web app bar: logo, the main tabs (Figma's bottom navigation, moved to the top), and the
 * user's avatar → profile. Logout lives on the profile page, as in the Figma profile screen.
 */
export function AppHeader() {
  const user = useCurrentUser();
  const pathname = usePathname();
  const onProfile = pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-5 lg:h-16">
        <Logo />

        <DesktopNav className="hidden lg:block" />

        {user && (
          <Link
            href="/profile"
            aria-current={onProfile ? "page" : undefined}
            className={cn(
              "hidden items-center gap-3 rounded-full p-1 outline-none transition-colors hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/40 lg:flex xl:pl-3",
              onProfile && "bg-primary-soft/70",
            )}
            title="Profile"
          >
            <span className="hidden text-right xl:block">
              <span className={cn("block text-sm leading-tight font-bold", onProfile && "text-accent-foreground")}>
                {user.name}
              </span>
              <span className="block text-xs text-muted-foreground">View profile</span>
            </span>
            <UserAvatar user={user} className="size-9 text-sm" />
          </Link>
        )}
      </div>

      <MobileTabBar className="lg:hidden" />
    </header>
  );
}
