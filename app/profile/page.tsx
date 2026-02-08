import { ProfileOverview } from "@/components/profile/profile-overview";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

interface SimulationSummary {
  id: string;
  seed: string;
  endingWealth: number;
  cagr: number;
  createdAt: string;
}

export default async function ProfilePage() {
  const { user, profile, supabase } = await requireUserProfile();
  let simulationHistory: SimulationSummary[] = [];

  const { data: simulationRows, error: simulationError } = await supabase
    .from("simulations")
    .select("id, seed, ending_wealth, cagr, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (!simulationError && simulationRows) {
    simulationHistory = (
      simulationRows as Array<Record<string, unknown>>
    ).map((row) => ({
      id: String(row.id ?? ""),
      seed: typeof row.seed === "string" ? row.seed : "universe",
      endingWealth:
        typeof row.ending_wealth === "number" ? row.ending_wealth : 0,
      cagr: typeof row.cagr === "number" ? row.cagr : 0,
      createdAt:
        typeof row.created_at === "string"
          ? row.created_at
          : new Date().toISOString(),
    }));
  }

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-slate-300">
            Review your persona and run history.
          </p>
        </div>
        <ProfileOverview
          profile={profile}
          simulationHistory={simulationHistory}
        />
      </section>
    </AppShell>
  );
}
