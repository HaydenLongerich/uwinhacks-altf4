"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { generateMarketTimeline } from "@/lib/engines/market";
import { scoreBehavior } from "@/lib/engines/behavior";
import { evaluateBadges, scoreCoins, scoreDecisionXp } from "@/lib/engines/rewards";
import { runSimulation } from "@/lib/engines/simulation";
import { createClient } from "@/lib/supabase/client";
import type { DecisionAction, MarketYear, YearDecision } from "@/lib/types/platform";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const DECISION_OPTIONS: Array<{ action: DecisionAction; description: string }> = [
  { action: "buy", description: "Increase risk to capture upside." },
  { action: "hold", description: "Stay the course." },
  { action: "sell", description: "Reduce risk and move to cash." },
  { action: "rebalance", description: "Restore target allocation." },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function randomSeed() {
  return `universe-${Date.now().toString(36)}`;
}

export function SimulationArena({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [seed, setSeed] = useState(searchParams.get("seed") ?? randomSeed());
  const [years, setYears] = useState(20);
  const [startingWealth, setStartingWealth] = useState(15000);
  const [yearlyContribution, setYearlyContribution] = useState(6000);
  const [started, setStarted] = useState(false);
  const [decisions, setDecisions] = useState<YearDecision[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const marketTimeline = useMemo(
    () => generateMarketTimeline(seed, years),
    [seed, years],
  );

  const currentYear = decisions.length;
  const activeMarket: MarketYear | null =
    currentYear < marketTimeline.length ? marketTimeline[currentYear] : null;

  const run = useMemo(() => {
    if (!started) {
      return null;
    }
    return runSimulation({
      seed,
      years,
      startingWealth,
      yearlyContribution,
      decisionPolicy: ({ yearIndex }) => decisions[yearIndex]?.action ?? "hold",
    });
  }, [decisions, seed, started, startingWealth, yearlyContribution, years]);

  const completed = started && decisions.length === years && run !== null;

  const chartData = useMemo(() => {
    if (!run) return [];
    return run.timeline.map((year) => ({
      year: `Y${year.year}`,
      wealth: Math.round(year.wealth),
      stress: Math.round(year.stress),
    }));
  }, [run]);

  const startRun = () => {
    setStarted(true);
    setDecisions([]);
    setStatus(null);
  };

  const chooseAction = (action: DecisionAction) => {
    if (!started || completed || currentYear >= years) {
      return;
    }
    setDecisions((current) => [
      ...current,
      {
        year: current.length + 1,
        action,
      },
    ]);
  };

  const saveResults = async () => {
    if (!run) return;
    setIsSaving(true);
    setStatus(null);

    const behavior = scoreBehavior(run.timeline);
    const badges = evaluateBadges(run.timeline);
    const xp = scoreDecisionXp(decisions);
    const coins = scoreCoins(decisions);
    const resultId = crypto.randomUUID();

    const payload = {
      id: resultId,
      userId,
      run,
      decisions,
      behavior,
      badges,
      xp,
      coins,
      createdAt: new Date().toISOString(),
    };

    sessionStorage.setItem(`altf4-result:${resultId}`, JSON.stringify(payload));

    try {
      const { error: simulationError } = await supabase.from("simulations").insert({
        id: resultId,
        user_id: userId,
        seed: run.seed,
        years: run.years,
        starting_wealth: run.startingWealth,
        ending_wealth: run.endingWealth,
        cagr: run.cagr,
        timeline_json: run.timeline,
        summary_json: {
          xp,
          coins,
          behavior,
          badges,
        },
      });

      if (simulationError) {
        throw simulationError;
      }

      await supabase.from("decisions").insert(
        decisions.map((decision) => ({
          simulation_id: resultId,
          user_id: userId,
          year: decision.year,
          action: decision.action,
          context_json: marketTimeline[decision.year - 1],
        })),
      );

      await supabase.from("behavior_scores").insert({
        user_id: userId,
        simulation_id: resultId,
        discipline: behavior.discipline,
        panic: behavior.panic,
        consistency: behavior.consistency,
        risk_tolerance: behavior.riskTolerance,
        patience: behavior.patience,
      });
    } catch {
      setStatus("Saved locally. Database tables may not be initialized yet.");
    } finally {
      setIsSaving(false);
    }

    router.push(`/results/${resultId}`);
  };

  return (
    <div className="space-y-5">
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Year-by-Year Simulator</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-xs text-slate-600">
            Seed Universe
            <Input
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              className="border-slate-200 bg-slate-50"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            Years (10-50)
            <Input
              type="number"
              min={10}
              max={50}
              value={years}
              onChange={(event) =>
                setYears(Math.min(50, Math.max(10, Number(event.target.value))))
              }
              className="border-slate-200 bg-slate-50"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            Starting Wealth
            <Input
              type="number"
              min={0}
              step={1000}
              value={startingWealth}
              onChange={(event) => setStartingWealth(Number(event.target.value))}
              className="border-slate-200 bg-slate-50"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            Yearly Contribution
            <Input
              type="number"
              min={0}
              step={500}
              value={yearlyContribution}
              onChange={(event) => setYearlyContribution(Number(event.target.value))}
              className="border-slate-200 bg-slate-50"
            />
          </label>
        </CardContent>
      </Card>

      {!started ? (
        <Button
          onClick={startRun}
          className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Start Simulation
        </Button>
      ) : null}

      {started ? (
        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {completed ? "Simulation Complete" : `Year ${currentYear + 1} / ${years}`}
            </CardTitle>
            <Badge variant="outline">
              {completed ? "Complete" : `${Math.round((decisions.length / years) * 100)}%`}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeMarket ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Market Event: {activeMarket.regime}
                </p>
                <p className="mt-2 text-sm text-slate-700">{activeMarket.headline}</p>
                <p className="text-xs text-slate-400">
                  Return {Math.round(activeMarket.returnPct * 100)}% | Volatility{" "}
                  {Math.round(activeMarket.volatility * 100)}%
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                All years completed. Save to view leaderboard and multiverse analysis.
              </p>
            )}

            {!completed && activeMarket ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {DECISION_OPTIONS.map((option) => (
                  <Button
                    key={option.action}
                    type="button"
                    variant="outline"
                    onClick={() => chooseAction(option.action)}
                    className="h-auto items-start justify-start border-slate-200 bg-slate-50 p-3 text-left text-slate-900 hover:bg-slate-100"
                  >
                    <span className="block">
                      <span className="block font-semibold uppercase">
                        {option.action}
                      </span>
                      <span className="text-xs text-slate-600">{option.description}</span>
                    </span>
                  </Button>
                ))}
              </div>
            ) : null}

            {chartData.length > 0 ? (
              <div className="h-72 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Line type="monotone" dataKey="wealth" stroke="#22d3ee" dot={false} />
                    <Line type="monotone" dataKey="stress" stroke="#f97316" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            {run ? (
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-3">
                <p>
                  Wealth: <span className="font-semibold">{formatCurrency(run.endingWealth)}</span>
                </p>
                <p>
                  CAGR: <span className="font-semibold">{(run.cagr * 100).toFixed(2)}%</span>
                </p>
                <p>
                  Decisions: <span className="font-semibold">{decisions.length}</span>
                </p>
              </div>
            ) : null}

            {completed ? (
              <Button
                type="button"
                onClick={saveResults}
                disabled={isSaving}
                className="w-full bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
              >
                {isSaving ? "Saving..." : "View Results"}
              </Button>
            ) : null}
            {status ? <p className="text-xs text-slate-600">{status}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
