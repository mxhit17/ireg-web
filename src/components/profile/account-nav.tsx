"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  BriefcaseBusiness,
  ChevronRight,
  ClipboardCheck,
  FileClock,
  Loader2,
  LogOut,
  MessageSquareText,
  MessagesSquare,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/api/normalize";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  /** Section not built yet — shown, but not clickable. */
  soon?: boolean;
}

/** Same menu as the Figma profile screen (Saved, My Consultations, Feedback, Logout) + project requests. */
const ITEMS: NavItem[] = [
  { label: "Profile", icon: UserRound, href: "/profile" },
  { label: "Saved", icon: Bookmark, href: "/profile/saved" },
  { label: "My project requests", icon: FileClock, href: "/projects/requests" },
  { label: "My Consultations", icon: BriefcaseBusiness, href: "/consultations" },
  { label: "Feedback", icon: MessageSquareText, href: "/feedback" },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: "Review project requests", icon: ClipboardCheck, href: "/admin/project-requests" },
  { label: "Manage consultations", icon: ShieldCheck, href: "/admin/consultations" },
  { label: "Feedback responses", icon: MessagesSquare, href: "/admin/feedback" },
];

const rowClass =
  "flex h-14 w-full items-center gap-3 px-5 text-[15px] transition-colors outline-none focus-visible:bg-secondary";

export function AccountNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const logout = useLogout();
  const user = useCurrentUser();
  const items = isAdmin(user) ? [...ITEMS.slice(0, 3), ...ADMIN_ITEMS, ...ITEMS.slice(3)] : ITEMS;

  return (
    <Card className={cn("overflow-hidden py-1", className)}>
      <nav aria-label="Account">
        <ul className="divide-y divide-border">
          {items.map(({ label, icon: Icon, href, soon }) => {
            const active = pathname === href;
            const content = (
              <>
                <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                <span className="flex-1 truncate">{label}</span>
                {soon ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    Soon
                  </span>
                ) : (
                  <ChevronRight className="size-4 text-subtle-foreground" />
                )}
              </>
            );
            return (
              <li key={href}>
                {soon ? (
                  <span aria-disabled className={cn(rowClass, "cursor-not-allowed text-muted-foreground")}>
                    {content}
                  </span>
                ) : (
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      rowClass,
                      "hover:bg-secondary",
                      active && "bg-primary-soft/60 font-bold text-accent-foreground hover:bg-primary-soft/60",
                    )}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className={cn(rowClass, "cursor-pointer text-left text-[#da1e1e] hover:bg-red-50")}
            >
              {logout.isPending ? (
                <Loader2 className="size-[18px] shrink-0 animate-spin" />
              ) : (
                <LogOut className="size-[18px] shrink-0" />
              )}
              <span className="flex-1">Logout</span>
              <ChevronRight className="size-4 text-red-300" />
            </button>
          </li>
        </ul>
      </nav>
    </Card>
  );
}
