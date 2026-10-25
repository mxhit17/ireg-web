import { AccountNav } from "@/components/profile/account-nav";

/**
 * Shared layout for the profile area (Profile, Saved, …).
 * Desktop: account menu on the left. Mobile: page content first, then the menu
 * (same order as the Figma profile screen).
 */
export function ProfileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
      <div className="order-last lg:sticky lg:top-24 lg:order-first">
        <h2 className="mb-3 hidden px-1 text-xs font-bold tracking-wider text-subtle-foreground uppercase lg:block">
          Account
        </h2>
        <AccountNav />
      </div>
      <div className="grid min-w-0 gap-6">{children}</div>
    </div>
  );
}
