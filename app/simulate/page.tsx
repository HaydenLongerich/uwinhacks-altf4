import Link from "next/link";
import { AppShell } from "@/components/platform/app-shell";
import { MarketGameArena } from "@/components/sim/market-game-arena";
import { SimulationArena } from "@/components/sim/simulation-arena";
import { Button } from "@/components/ui/button";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

export default async function SimulatePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "classic" ? "classic" : "game";
  const { user, profile } = await requireUserProfile();

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Simulation Arena</h1>
          <p className="text-sm text-slate-600">
            Trade a persistent multi-stock simulator over time with chart ranges and
            auto-saved progress, or use the classic year-by-year simulator.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <Button
            asChild
            variant={mode === "game" ? "default" : "ghost"}
            className={
              mode === "game"
                ? "rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                : "rounded-full text-slate-700 hover:bg-slate-100"
            }
          >
            <Link href="/simulate">Market Simulator</Link>
          </Button>
          <Button
            asChild
            variant={mode === "classic" ? "default" : "ghost"}
            className={
              mode === "classic"
                ? "rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                : "rounded-full text-slate-700 hover:bg-slate-100"
            }
          >
            <Link href="/simulate?mode=classic">Classic</Link>
          </Button>
        </div>
        {mode === "game" ? <MarketGameArena userId={user.id} /> : null}
        {mode === "classic" ? <SimulationArena userId={user.id} /> : null}
      </section>
    </AppShell>
  );
}
