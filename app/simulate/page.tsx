import { SimulationArena } from "@/components/sim/simulation-arena";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

export default async function SimulatePage() {
  const { user, profile } = await requireUserProfile();

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Simulation Arena</h1>
          <p className="text-sm text-slate-300">
            Run long-horizon scenarios and test your decisions year by year.
          </p>
        </div>
        <SimulationArena userId={user.id} />
      </section>
    </AppShell>
  );
}
