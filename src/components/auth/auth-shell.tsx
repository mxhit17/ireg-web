import Link from "next/link";
import { ArrowLeft, BadgeCheck, MessagesSquare, Star } from "lucide-react";

import { ProjectShowcase } from "@/components/auth/project-showcase";
import { Logo } from "@/components/brand/logo";

export const MOTTO = "Real People. Real Reviews. Trusted Decisions";

const FEATURES = [
  { icon: MessagesSquare, text: "Honest discussions from buyers and residents" },
  { icon: Star, text: "Projects rated on 5 parameters that matter" },
  { icon: BadgeCheck, text: "Lawyers, CAs and bankers one chat away" },
];

/**
 * Desktop: split screen — brand story on the left, form on the right.
 * Mobile: just the form, with the app-bar logo on top (mirrors the mobile app).
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <main className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5 lg:justify-end lg:border-0 lg:px-8 lg:pt-6">
          <div className="min-w-0 lg:hidden">
            <Logo />
            <p className="mt-0.5 pl-9 text-[11px] font-semibold text-muted-foreground">{MOTTO}</p>
          </div>
          {/* Browsing doesn't need an account — let people go back to it. */}
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary outline-none hover:underline focus-visible:underline"
          >
            <ArrowLeft className="size-5 sm:size-4" aria-hidden />
            <span className="max-sm:sr-only">Continue without logging in</span>
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
        <footer className="px-5 pb-6 text-center text-xs text-subtle-foreground">
          © {new Date().getFullYear()} IREG · Indian Real Estate Guide
        </footer>
      </main>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-primary text-white lg:flex lg:flex-col">
      {/* soft decorative shapes */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 size-[420px] rounded-full bg-white/[0.07]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-[480px] rounded-full bg-sky-900/25" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_left,black_20%,transparent_70%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col px-10 py-9 xl:px-14">
        <div>
          <Logo variant="inverted" />
          <p className="mt-2 pl-9 text-sm font-semibold tracking-wide text-sky-100">{MOTTO}</p>
        </div>

        <div className="mt-auto max-w-lg pt-12">
          <h1 className="text-[2.5rem] leading-[1.1] font-extrabold tracking-tight xl:text-5xl">
            Know the project before you buy into it.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-sky-100">
            Real conversations and ratings on builder projects across India — from people who live there.
          </p>
        </div>

        <ProjectShowcase />

        <ul className="mt-10 grid gap-3.5">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-[15px] font-medium text-sky-50">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/12">
                <Icon className="size-4" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="mt-auto" />
      </div>
    </aside>
  );
}
