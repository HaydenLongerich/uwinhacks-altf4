"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function projectWealth(params: {
  ageStart: number;
  ageEnd: number;
  monthlyContribution: number;
  risk: number;
}) {
  const years = Math.max(1, params.ageEnd - params.ageStart);
  const annualContribution = params.monthlyContribution * 12;
  const expectedReturn = 0.03 + params.risk * 0.0012;
  const conservativeReturn = Math.max(0.015, expectedReturn - 0.035);
  const aggressiveReturn = expectedReturn + 0.04;

  const future = (rate: number) => {
    let wealth = 0;
    for (let year = 0; year < years; year += 1) {
      wealth = (wealth + annualContribution) * (1 + rate);
    }
    return wealth;
  };

  return {
    conservative: future(conservativeReturn),
    expected: future(expectedReturn),
    aggressive: future(aggressiveReturn),
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function WealthTimeMachine() {
  const [ageStart, setAgeStart] = useState(20);
  const [ageEnd, setAgeEnd] = useState(60);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [risk, setRisk] = useState(55);

  const projection = useMemo(
    () =>
      projectWealth({
        ageStart,
        ageEnd,
        monthlyContribution,
        risk,
      }),
    [ageStart, ageEnd, monthlyContribution, risk],
  );

  return (
    <Card className="border-white/10 bg-slate-900/70">
      <CardHeader>
        <CardTitle>Wealth Time Machine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-slate-300">
            Start age
            <Input
              type="number"
              min={18}
              max={60}
              value={ageStart}
              className="border-white/15 bg-slate-950/70"
              onChange={(event) => setAgeStart(Number(event.target.value))}
            />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            End age
            <Input
              type="number"
              min={ageStart + 1}
              max={75}
              value={ageEnd}
              className="border-white/15 bg-slate-950/70"
              onChange={(event) => setAgeEnd(Number(event.target.value))}
            />
          </label>
        </div>

        <label className="space-y-1 text-xs text-slate-300">
          Monthly contribution
          <Input
            type="number"
            min={0}
            step={50}
            value={monthlyContribution}
            className="border-white/15 bg-slate-950/70"
            onChange={(event) => setMonthlyContribution(Number(event.target.value))}
          />
        </label>

        <label className="space-y-1 text-xs text-slate-300">
          Risk level ({risk})
          <Input
            type="range"
            min={10}
            max={90}
            value={risk}
            className="border-white/15 bg-slate-950/70"
            onChange={(event) => setRisk(Number(event.target.value))}
          />
        </label>

        <div className="grid gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">Conservative</p>
            <p className="font-semibold text-slate-100">
              {formatCurrency(projection.conservative)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Expected</p>
            <p className="font-semibold text-cyan-200">
              {formatCurrency(projection.expected)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Aggressive</p>
            <p className="font-semibold text-emerald-300">
              {formatCurrency(projection.aggressive)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
