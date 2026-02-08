import { PortfolioBuilder } from "@/components/portfolio/portfolio-builder";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

export default async function PortfolioPage() {
  const { user, profile } = await requireUserProfile();

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Portfolio Builder</h1>
          <p className="text-sm text-slate-300">
            Design allocation templates and track risk, growth, and stability.
          </p>
        </div>
        <PortfolioBuilder userId={user.id} />
      </section>
    </AppShell>
  );
}
