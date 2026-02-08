"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { evaluateRules } from "@/lib/engines/strategies";
import { runSimulation } from "@/lib/engines/simulation";
import { createClient } from "@/lib/supabase/client";
import { applyProfileProgress } from "@/lib/supabase/progress";
import { activityRewards } from "@/lib/data/activity-rewards";
import type { StrategyRule } from "@/lib/types/platform";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const metricOptions: StrategyRule["metric"][] = [
  "marketDrop",
  "risk",
  "allocationDrift",
];
const operatorOptions: StrategyRule["operator"][] = [">", "<", ">=", "<="];
const actionOptions: StrategyRule["action"][] = [
  "buy",
  "hold",
  "sell",
  "rebalance",
];

function createRule(): StrategyRule {
  return {
    id: crypto.randomUUID(),
    metric: "marketDrop",
    operator: ">=",
    value: 20,
    action: "buy",
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function StrategyBuilder({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("Crash Buyer");
  const [seed, setSeed] = useState("strategy-lab");
  const [years, setYears] = useState(20);
  const [rules, setRules] = useState<StrategyRule[]>([createRule()]);
  const [status, setStatus] = useState<string | null>(null);

  const simulation = useMemo(
    () =>
      runSimulation({
        seed,
        years,
        startingWealth: 12000,
        yearlyContribution: 5500,
        decisionPolicy: ({ market, previousState }) =>
          evaluateRules({
            rules,
            market,
            previousState,
          }),
      }),
    [rules, seed, years],
  );

  const chartData = simulation.timeline.map((year) => ({
    year: `Y${year.year}`,
    wealth: Math.round(year.wealth),
  }));

  const updateRule = (id: string, patch: Partial<StrategyRule>) => {
    setRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
    );
  };

  const addRule = () => setRules((current) => [...current, createRule()]);
  const removeRule = (id: string) =>
    setRules((current) => current.filter((rule) => rule.id !== id));

  const saveStrategy = async () => {
    const { xp: rewardXp, coins: rewardCoins } = activityRewards.strategyTemplate;
    const payload = {
      user_id: userId,
      name,
      rule_json: rules,
      is_active: true,
    };

    localStorage.setItem(`altf4-strategy:${name}`, JSON.stringify(payload));
    setStatus(null);

    let strategyStatus =
      "Strategy saved locally. Database tables may not be initialized yet.";
    try {
      await supabase.from("strategies").insert(payload);
      strategyStatus = "Strategy saved to database and local storage.";
    } catch {
      // Keep local-save status fallback; reward update still runs.
    }

    const progressResult = await applyProfileProgress({
      supabase,
      userId,
      xpDelta: rewardXp,
      coinsDelta: rewardCoins,
    });

    if (progressResult.ok) {
      setStatus(`${strategyStatus} +${rewardXp} XP, +${rewardCoins} coins.`);
      router.refresh();
    } else {
      setStatus(
        `${strategyStatus} Rewards failed: ${progressResult.error ?? "profile update error"}`,
      );
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Rule-Based Strategy Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-xs text-slate-600">
              Strategy name
              <Input
                value={name}
                className="border-slate-200 bg-slate-50"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-xs text-slate-600">
              Seed
              <Input
                value={seed}
                className="border-slate-200 bg-slate-50"
                onChange={(event) => setSeed(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-xs text-slate-600">
              Years
              <Input
                type="number"
                min={10}
                max={50}
                value={years}
                className="border-slate-200 bg-slate-50"
                onChange={(event) =>
                  setYears(Math.min(50, Math.max(10, Number(event.target.value))))
                }
              />
            </label>
          </div>

          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-2 sm:grid-cols-5">
                  <select
                    value={rule.metric}
                    onChange={(event) =>
                      updateRule(rule.id, {
                        metric: event.target.value as StrategyRule["metric"],
                      })
                    }
                    className="rounded-md border border-slate-300 bg-slate-50 px-2 py-2 text-sm"
                  >
                    {metricOptions.map((metric) => (
                      <option key={metric} value={metric}>
                        {metric}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rule.operator}
                    onChange={(event) =>
                      updateRule(rule.id, {
                        operator: event.target.value as StrategyRule["operator"],
                      })
                    }
                    className="rounded-md border border-slate-300 bg-slate-50 px-2 py-2 text-sm"
                  >
                    {operatorOptions.map((operator) => (
                      <option key={operator} value={operator}>
                        {operator}
                      </option>
                    ))}
                  </select>

                  <Input
                    type="number"
                    value={rule.value}
                    className="border-slate-300 bg-slate-50"
                    onChange={(event) =>
                      updateRule(rule.id, { value: Number(event.target.value) })
                    }
                  />

                  <select
                    value={rule.action}
                    onChange={(event) =>
                      updateRule(rule.id, {
                        action: event.target.value as StrategyRule["action"],
                      })
                    }
                    className="rounded-md border border-slate-300 bg-slate-50 px-2 py-2 text-sm"
                  >
                    {actionOptions.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-200 bg-transparent text-slate-900 hover:bg-slate-100"
                    onClick={() => removeRule(rule.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100"
              onClick={addRule}
            >
              Add Rule
            </Button>
            <Button
              type="button"
              className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
              onClick={saveStrategy}
            >
              Save Strategy
            </Button>
          </div>
          {status ? <p className="text-xs text-slate-600">{status}</p> : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Backtest Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p>
              Ending wealth:{" "}
              <span className="font-semibold">{formatCurrency(simulation.endingWealth)}</span>
            </p>
            <p>
              CAGR: <span className="font-semibold">{(simulation.cagr * 100).toFixed(2)}%</span>
            </p>
          </div>

          <div className="h-72 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="wealth" stroke="#22d3ee" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
