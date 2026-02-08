import { StrategyBuilder } from "@/components/strategies/strategy-builder";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

export default async function StrategiesPage() {
  const { user, profile } = await requireUserProfile();

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Strategy Builder</h1>
          <p className="text-sm text-slate-300">
            Create rule-based playbooks and backtest them instantly.
          </p>
        </div>
        <StrategyBuilder userId={user.id} />
      </section>
    </AppShell>
  );
}
