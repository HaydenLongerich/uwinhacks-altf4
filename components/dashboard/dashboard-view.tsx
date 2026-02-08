"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WealthTimeMachine } from "@/components/dashboard/wealth-time-machine";
import { dailyMissions, weeklyMissions } from "@/lib/data/missions";
import type { PlatformProfile } from "@/lib/types/platform";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardView({
  profile,
  portfolioSeries,
  allocationSeries,
  returnsSeries,
}: {
  profile: PlatformProfile;
  portfolioSeries: Array<{ year: string; wealth: number }>;
  allocationSeries: Array<{ name: string; value: number }>;
  returnsSeries: Array<{ year: string; user: number; index: number }>;
}) {
  const latestWealth = portfolioSeries[portfolioSeries.length - 1]?.wealth ?? 0;
  const previousWealth = portfolioSeries[portfolioSeries.length - 2]?.wealth ?? 0;
  const delta = latestWealth - previousWealth;
  const deltaPct = previousWealth > 0 ? (delta / previousWealth) * 100 : 0;

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-3 md:grid-cols-4"
      >
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(latestWealth)}</p>
            <p className={`text-xs ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {delta >= 0 ? "+" : ""}
              {deltaPct.toFixed(2)}% this year
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Level + XP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">L{profile.level}</p>
            <p className="text-xs text-slate-600">{profile.xp} XP total</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{profile.streak} days</p>
            <p className="text-xs text-slate-600">{profile.streakFreezes} freeze items</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Behavior Core</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-slate-600">
            <p>Discipline: {profile.discipline}</p>
            <p>Risk tolerance: {profile.riskTolerance}</p>
            <p>Patience: {profile.patience}</p>
          </CardContent>
        </Card>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Portfolio Value Timeline</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioSeries}>
                <defs>
                  <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#22d3ee" stopOpacity={0.8} />
                    <stop offset="90%" stopColor="#22d3ee" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="wealth"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#wealthGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Allocation Mix</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationSeries}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={92}
                  fill="#22d3ee"
                  label
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Returns vs Index</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={returnsSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="user"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="index"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daily Missions</CardTitle>
            <Badge variant="secondary">{dailyMissions.length} active</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyMissions.map((mission) => (
              <div
                key={mission.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <p className="font-medium">{mission.title}</p>
                <p className="text-xs text-slate-600">{mission.description}</p>
                <p className="mt-1 text-xs text-cyan-700">
                  +{mission.xp} XP | +{mission.coins} coins
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly Missions</CardTitle>
            <Badge variant="outline">Streak freeze ready</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {weeklyMissions.map((mission) => (
              <div
                key={mission.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <p className="font-medium">{mission.title}</p>
                <p className="text-xs text-slate-600">{mission.description}</p>
                <p className="mt-1 text-xs text-cyan-700">
                  +{mission.xp} XP | +{mission.coins} coins
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button asChild className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400">
          <Link href="/learn">Learn</Link>
        </Button>
        <Button asChild variant="outline" className="border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100">
          <Link href="/simulate">Simulate</Link>
        </Button>
        <Button asChild variant="outline" className="border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100">
          <Link href="/portfolio">Build Portfolio</Link>
        </Button>
      </div>

      <WealthTimeMachine />
    </div>
  );
}
