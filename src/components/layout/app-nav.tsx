"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, House, LogIn, MessageSquare, UserRound, type LucideIcon } from "lucide-react";

import { useCurrentUser } from "@/hooks/use-auth";
import { loginHref } from "@/lib/auth/constants";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  /** Shorter label for the mobile tab bar. */
  short?: string;
  href: string;
  icon: LucideIcon;
  /** Extra path prefixes that keep this tab active (e.g. project pages under Threads). */
  match?: string[];
}

/** Same five destinations, order and icons as the Figma bottom navigation. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Threads & Search", short: "Threads", href: "/", icon: House, match: ["/projects"] },
  { label: "Knowledge Base", short: "Knowledge", href: "/knowledge-base", icon: Compass },
  { label: "Blogs", href: "/blogs", icon: MessageSquare },
  { label: "Consultation", href: "/consultations", icon: Bookmark },
  { label: "Profile", href: "/profile", icon: UserRound },
];

export function isActive(pathname: string, item: NavItem) {
  if (item.href === "/") return pathname === "/" || !!item.match?.some((m) => pathname.startsWith(m));
  return pathname === item.href || pathname.startsWith(`${item.href}/`) || !!item.match?.some((m) => pathname.startsWith(m));
}

/**
 * Desktop: inline tabs in the header (icon + label, underline on the active tab).
 * Profile is reached via the avatar on desktop, so it's omitted here.
 */
export function DesktopNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className={cn("h-full", className)}>
      <ul className="flex h-full items-stretch gap-1">
        {NAV_ITEMS.filter((i) => i.href !== "/profile").map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 rounded-md px-3 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
                  active
                    ? "font-bold text-primary after:bg-primary"
                    : "font-medium text-slate-500 after:bg-transparent hover:text-foreground",
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Mobile/tablet: the Figma bottom navigation, moved to the top under the app bar —
 * five equal tabs, 22px icon over an 11px label, sky-600 + bold when active.
 */
export function MobileTabBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const user = useCurrentUser();
  // Signed-out visitors get "Log in" in the Profile slot (and come back here afterwards).
  const items = user
    ? NAV_ITEMS
    : NAV_ITEMS.map((i) => (i.href === "/profile" ? { ...i, label: "Log in", href: loginHref(pathname), icon: LogIn } : i));
  return (
    <nav aria-label="Main" className={cn("border-t border-border bg-white", className)}>
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] leading-none outline-none focus-visible:bg-secondary",
                  "after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full",
                  active ? "font-bold text-primary after:bg-primary" : "font-medium text-subtle-foreground",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 2} aria-hidden />
                <span className="max-w-full truncate px-1">{item.short ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
