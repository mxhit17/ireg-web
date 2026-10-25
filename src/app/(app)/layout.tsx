import { AuthGate } from "@/components/auth/auth-gate";
import { AppHeader } from "@/components/layout/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-dvh flex-col bg-muted">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8">{children}</main>
      </div>
    </AuthGate>
  );
}
