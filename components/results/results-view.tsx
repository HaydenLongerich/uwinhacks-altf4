"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { simulateNpcLeaderboard } from "@/lib/engines/npc";
import { runSimulation } from "@/lib/engines/simulation";
import type { DecisionAction, SimulationRun, YearDecision } from "@/lib/types/platform";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ResultPayload {
  id: string;
  run: SimulationRun;
  decisions: YearDecision[];
  behavior: {
    discipline: number;
    panic: number;
    consistency: number;
    riskTolerance: number;
    patience: number;
  };
  badges: Array<{ key: string; name: string; description: string }>;
  xp: number;
  coins: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function actionBreakdown(decisions: YearDecision[]) {
  const counts: Record<DecisionAction, number> = {
    buy: 0,
    hold: 0,
    sell: 0,
    rebalance: 0,
  };
  for (const decision of decisions) {
    counts[decision.action] += 1;
  }
  return [
    { action: "buy", count: counts.buy },
    { action: "hold", count: counts.hold },
    { action: "sell", count: counts.sell },
    { action: "rebalance", count: counts.rebalance },
  ];
}

function buildMistakes(run: SimulationRun) {
  const mistakes: string[] = [];
  const crashSells = run.timeline.filter(
    (year) => year.market.regime === "crash" && year.action === "sell",
  ).length;
  const averageCash =
    run.timeline.reduce((sum, year) => sum + year.allocation.cash, 0) /
    run.timeline.length;
  const lateCycleBuys = run.timeline.filter(
    (year) => year.market.regime === "boom" && year.action === "buy",
  ).length;

  if (crashSells > 0) {
    mistakes.push(`Panic selling occurred in ${crashSells} crash year(s).`);
  }
  if (averageCash > 35) {
    mistakes.push("Cash drag was high. Consider tighter re-entry rules.");
  }
  if (lateCycleBuys > 4) {
    mistakes.push("Frequent late-cycle buys increased drawdown risk.");
  }
  if (mistakes.length === 0) {
    mistakes.push("No major behavior errors detected. Execution stayed consistent.");
  }
  return mistakes;
}

export function ResultsView({ resultId }: { resultId: string }) {
  const supabase = createClient();
  const [payload, setPayload] = useState<ResultPayload | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const read = async () => {
      const local = sessionStorage.getItem(`altf4-result:${resultId}`);
      if (local && mounted) {
        setPayload(JSON.parse(local) as ResultPayload);
        return;
      }

      try {
        const { data: simulation } = await supabase
          .from("simulations")
          .select("*")
          .eq("id", resultId)
          .maybeSingle();

        if (!simulation || !mounted) {
          setStatus("No saved result found.");
          return;
        }

        const { data: decisionRows } = await supabase
          .from("decisions")
          .select("*")
          .eq("simulation_id", resultId)
          .order("year", { ascending: true });

        const summary =
          simulation.summary_json && typeof simulation.summary_json === "object"
            ? simulation.summary_json
            : {};

        const reconstructed: ResultPayload = {
          id: simulation.id as string,
          run: {
            id: simulation.id as string,
            seed: (simulation.seed as string) ?? "universe",
            years: (simulation.years as number) ?? 20,
            startingWealth: (simulation.starting_wealth as number) ?? 10000,
            yearlyContribution: 0,
            timeline: (simulation.timeline_json as SimulationRun["timeline"]) ?? [],
            endingWealth: (simulation.ending_wealth as number) ?? 0,
            cagr: (simulation.cagr as number) ?? 0,
          },
          decisions:
            decisionRows?.map((row) => ({
              year: (row.year as number) ?? 1,
              action: (row.action as DecisionAction) ?? "hold",
            })) ?? [],
          behavior: {
            discipline:
              typeof summary.discipline === "number" ? summary.discipline : 50,
            panic: typeof summary.panic === "number" ? summary.panic : 50,
            consistency:
              typeof summary.consistency === "number" ? summary.consistency : 50,
            riskTolerance:
              typeof summary.riskTolerance === "number"
                ? summary.riskTolerance
                : 50,
            patience: typeof summary.patience === "number" ? summary.patience : 50,
          },
          badges: Array.isArray(summary.badges)
            ? (summary.badges as ResultPayload["badges"])
            : [],
          xp: typeof summary.xp === "number" ? summary.xp : 0,
          coins: typeof summary.coins === "number" ? summary.coins : 0,
        };

        if (mounted) {
          setPayload(reconstructed);
        }
      } catch {
        if (mounted) {
          setStatus("Could not load result.");
        }
      }
    };

    void read();
    return () => {
      mounted = false;
    };
  }, [resultId, supabase]);

  const wealthChart = payload?.run.timeline.map((year) => ({
    year: `Y${year.year}`,
    wealth: Math.round(year.wealth),
    stress: Math.round(year.stress),
  }));

  const breakdown = payload ? actionBreakdown(payload.decisions) : [];
  const mistakes = payload ? buildMistakes(payload.run) : [];

  const leaderboard = useMemo(() => {
    if (!payload) return [];
    return simulateNpcLeaderboard({
      seed: payload.run.seed,
      years: payload.run.years,
      startingWealth: payload.run.startingWealth,
      yearlyContribution: payload.run.yearlyContribution,
    });
  }, [payload]);

  const multiverse = useMemo(() => {
    if (!payload) return [];
    const seeds = [payload.run.seed, `${payload.run.seed}-alt-a`, `${payload.run.seed}-alt-b`];
    const decisionMap = new Map(payload.decisions.map((decision) => [decision.year - 1, decision.action]));
    const series = seeds.map((seed) =>
      runSimulation({
        seed,
        years: payload.run.years,
        startingWealth: payload.run.startingWealth,
        yearlyContribution: payload.run.yearlyContribution,
        decisionPolicy: ({ yearIndex }) => decisionMap.get(yearIndex) ?? "hold",
      }),
    );

    return Array.from({ length: payload.run.years }).map((_, index) => ({
      year: `Y${index + 1}`,
      base: Math.round(series[0].timeline[index]?.wealth ?? 0),
      altA: Math.round(series[1].timeline[index]?.wealth ?? 0),
      altB: Math.round(series[2].timeline[index]?.wealth ?? 0),
    }));
  }, [payload]);

  if (!payload) {
    return (
      <Card className="border-white/10 bg-slate-900/70">
        <CardContent className="py-8 text-center text-sm text-slate-300">
          {status ?? "Loading results..."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-slate-900/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Simulation Summary</CardTitle>
          <div className="flex gap-2">
            {payload.badges.map((badge) => (
              <Badge key={badge.key}>{badge.name}</Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-slate-400">Ending wealth</p>
            <p className="font-semibold">{formatCurrency(payload.run.endingWealth)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-slate-400">CAGR</p>
            <p className="font-semibold">{(payload.run.cagr * 100).toFixed(2)}%</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-slate-400">XP gained</p>
            <p className="font-semibold">{payload.xp}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-slate-400">Coins gained</p>
            <p className="font-semibold">{payload.coins}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-white/10 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Wealth and Stress</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wealthChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="wealth" stroke="#22d3ee" dot={false} />
                <Line type="monotone" dataKey="stress" stroke="#f97316" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Decision Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="action" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="count" fill="#22d3ee" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-slate-900/70">
        <CardHeader>
          <CardTitle>Mistake Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-200">
          {mistakes.map((item) => (
            <p key={item}>- {item}</p>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-900/70">
        <CardHeader>
          <CardTitle>NPC Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {leaderboard.map((npc, index) => (
            <div key={npc.npcKey} className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <p>
                {index + 1}. {npc.npcLabel}
              </p>
              <p className="font-semibold">{formatCurrency(npc.endingWealth)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-900/70">
        <CardHeader>
          <CardTitle>Multiverse Comparison</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={multiverse}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="base" stroke="#22d3ee" dot={false} />
              <Line type="monotone" dataKey="altA" stroke="#f97316" dot={false} />
              <Line type="monotone" dataKey="altB" stroke="#a855f7" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild className="bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300">
          <Link href={`/simulate?seed=${encodeURIComponent(payload.run.seed)}`}>
            Replay Better
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/10">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
