import { BadgeCheck, MapPin, MessagesSquare, Star } from "lucide-react";

import { Logo } from "@/components/brand/logo";

const RATING_PARAMS = [
  { label: "Location & Connectivity", value: 4.8 },
  { label: "Amenities & Facilities", value: 4.6 },
  { label: "Surrounding & Environment", value: 4.4 },
  { label: "Construction Quality", value: 4.5 },
  { label: "Builder", value: 4.7 },
];

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
    <div className="grid min-h-dvh lg:grid-cols-2 xl:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <main className="flex flex-col">
        <header className="flex items-center border-b border-border px-5 py-3.5 lg:hidden">
          <Logo />
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
        <Logo variant="inverted" />

        <div className="mt-auto max-w-lg pt-12">
          <h1 className="text-[2.5rem] leading-[1.1] font-extrabold tracking-tight xl:text-5xl">
            Know the project before you buy into it.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-sky-100">
            Real conversations and ratings on builder projects across India — from people who live there.
          </p>
        </div>

        <PreviewCard />

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

/** A miniature of the project card from the Figma "threads-list" screen. */
function PreviewCard() {
  return (
    <div
      aria-hidden
      className="mt-10 w-full max-w-md rotate-[-1.5deg] rounded-[18px] border border-white/20 bg-white text-foreground shadow-2xl shadow-sky-950/30"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="size-12 shrink-0 rounded-[10px] bg-gradient-to-br from-sky-300 via-sky-500 to-indigo-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base leading-tight font-bold">Prestige Lakeside Habitat</p>
          <p className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 text-primary" /> Whitefield, Bengaluru
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold">
          <Star className="size-4 fill-star text-star" /> 4.6
        </div>
      </div>
      <div className="space-y-2 rounded-b-[18px] border-t border-border bg-muted px-4 py-3.5">
        {RATING_PARAMS.map((p) => (
          <div key={p.label} className="flex items-center gap-3 text-xs">
            <span className="w-40 shrink-0 text-muted-foreground">{p.label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${(p.value / 5) * 100}%` }} />
            </span>
            <span className="w-6 text-right font-semibold">{p.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
