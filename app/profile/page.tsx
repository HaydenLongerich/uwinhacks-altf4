import { ProfileOverview } from "@/components/profile/profile-overview";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

interface BehaviorPoint {
  run: string;
  discipline: number;
  panic: number;
  consistency: number;
}

interface SimulationSummary {
  id: string;
  seed: string;
  endingWealth: number;
  cagr: number;
  createdAt: string;
}

export default async function ProfilePage() {
  const { user, profile, supabase } = await requireUserProfile();
  let behaviorHistory: BehaviorPoint[] = [];
  let simulationHistory: SimulationSummary[] = [];

  const { data: behaviorRows, error: behaviorError } = await supabase
    .from("behavior_scores")
    .select("discipline, panic, consistency, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(8);

  if (!behaviorError && behaviorRows) {
    behaviorHistory = (behaviorRows as Array<Record<string, unknown>>).map(
      (row, index) => ({
        run: `R${index + 1}`,
        discipline:
          typeof row.discipline === "number"
            ? row.discipline
            : profile.discipline,
        panic: typeof row.panic === "number" ? row.panic : 50,
        consistency:
          typeof row.consistency === "number"
            ? row.consistency
            : profile.patience,
      }),
    );
  }

  if (behaviorHistory.length === 0) {
    behaviorHistory = [
      {
        run: "R1",
        discipline: profile.discipline,
        panic: Math.max(0, 100 - profile.patience),
        consistency: profile.patience,
      },
    ];
  }

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
            Review your behavior trends, persona, and run history.
          </p>
        </div>
        <ProfileOverview
          profile={profile}
          behaviorHistory={behaviorHistory}
          simulationHistory={simulationHistory}
        />
      </section>
    </AppShell>
  );
}
