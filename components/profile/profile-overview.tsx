"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildCoachAdvice, inferInvestorPersona } from "@/lib/engines/behavior";
import type { PlatformProfile } from "@/lib/types/platform";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProfileOverview({
  profile,
  behaviorHistory,
  simulationHistory,
}: {
  profile: PlatformProfile;
  behaviorHistory: BehaviorPoint[];
  simulationHistory: SimulationSummary[];
}) {
  const persona = inferInvestorPersona({
    discipline: profile.discipline,
    panic: 100 - profile.patience,
    consistency: profile.patience,
    riskTolerance: profile.riskTolerance,
    patience: profile.patience,
  });

  const advice = buildCoachAdvice({
    discipline: profile.discipline,
    panic: 100 - profile.patience,
    consistency: profile.patience,
    riskTolerance: profile.riskTolerance,
    patience: profile.patience,
  });

  return (
    <div className="space-y-5">
      <Card className="border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{profile.username}</CardTitle>
          <Badge>{persona}</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs text-slate-400">Level + XP</p>
            <p className="font-semibold">
              L{profile.level} | {profile.xp} XP
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs text-slate-400">Coins + Streak</p>
            <p className="font-semibold">
              {profile.coins} coins | {profile.streak} days
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs text-slate-400">Avatar</p>
            <p className="font-semibold">
              {profile.avatarCompleted ? "Configured" : "Not set"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Behavior Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={behaviorHistory}>
                <XAxis dataKey="run" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="discipline" stroke="#22d3ee" dot={false} />
                <Line type="monotone" dataKey="panic" stroke="#f97316" dot={false} />
                <Line type="monotone" dataKey="consistency" stroke="#a78bfa" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>AI Coach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {advice.map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Simulation History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {simulationHistory.length === 0 ? (
            <p className="text-sm text-slate-600">No completed simulations yet.</p>
          ) : (
            simulationHistory.map((run) => (
              <div
                key={run.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <p className="font-medium">{run.seed}</p>
                <p className="text-xs text-slate-600">
                  {new Date(run.createdAt).toLocaleDateString()} | CAGR{" "}
                  {(run.cagr * 100).toFixed(2)}% | {formatCurrency(run.endingWealth)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
