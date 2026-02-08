"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import {
  marketSimStartDay,
  marketSimStocks,
  marketStockSeriesBySymbol,
} from "@/lib/data/market-sim-stocks";
import type { PlatformProfile } from "@/lib/types/platform";

interface ChartPoint {
  year: string;
  wealth: number;
}

interface ReturnPoint {
  year: string;
  user: number;
  index: number;
}

interface AllocationPoint {
  name: string;
  value: number;
}

interface DashboardSeriesData {
  portfolioSeries: ChartPoint[];
  allocationSeries: AllocationPoint[];
  returnsSeries: ReturnPoint[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round1(value: number) {
  return Number(value.toFixed(1));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function compressSeries<T>(series: T[], maxPoints = 180) {
  if (series.length <= maxPoints) {
    return series;
  }
  const step = Math.ceil(series.length / maxPoints);
  return series.filter((_, index) => index % step === 0 || index === series.length - 1);
}

function priceAt(symbol: string, dayIndex: number) {
  const series = marketStockSeriesBySymbol[symbol] ?? [];
  const safeIndex = Math.max(0, Math.min(series.length - 1, dayIndex));
  return series[safeIndex] ?? 0;
}

function buildLocalSeriesFromStorage(userId: string): DashboardSeriesData | null {
  const raw = localStorage.getItem(`altf4-market-sim:${userId}`);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.simulator)) {
      return null;
    }
    const simulator = parsed.simulator;
    const historyRaw = Array.isArray(simulator.portfolioHistory)
      ? simulator.portfolioHistory
      : [];

    const history = historyRaw
      .map((point) => {
        if (!isRecord(point)) {
          return null;
        }
        const dayIndex = Math.max(0, Math.floor(toNumber(point.dayIndex, -1)));
        const wealth = Math.max(0, toNumber(point.value, 0));
        if (!Number.isFinite(dayIndex) || dayIndex < 0 || wealth <= 0) {
          return null;
        }
        return { dayIndex, wealth };
      })
      .filter((point): point is { dayIndex: number; wealth: number } => Boolean(point))
      .sort((left, right) => left.dayIndex - right.dayIndex);

    if (history.length === 0) {
      return null;
    }

    const sampled = compressSeries(history, 180);
    const firstWealth = Math.max(1, sampled[0].wealth);
    const baselineDay = Math.max(0, marketSimStartDay);
    const baselineAverage =
      marketSimStocks.reduce((sum, stock) => sum + priceAt(stock.symbol, baselineDay), 0) /
      Math.max(1, marketSimStocks.length);

    const portfolioSeries = sampled.map((point) => ({
      year: `D${Math.max(1, point.dayIndex - marketSimStartDay + 1)}`,
      wealth: Math.round(point.wealth),
    }));

    const returnsSeries = sampled.map((point) => {
      const userReturn = ((point.wealth / firstWealth) - 1) * 100;
      const currentAverage =
        marketSimStocks.reduce((sum, stock) => sum + priceAt(stock.symbol, point.dayIndex), 0) /
        Math.max(1, marketSimStocks.length);
      const indexReturn =
        baselineAverage > 0 ? ((currentAverage / baselineAverage) - 1) * 100 : 0;

      return {
        year: `D${Math.max(1, point.dayIndex - marketSimStartDay + 1)}`,
        user: round2(userReturn),
        index: round2(indexReturn),
      };
    });

    const values: Record<string, number> = {};
    const holdings = isRecord(simulator.holdings) ? simulator.holdings : {};
    const currentDay = Math.max(
      0,
      Math.floor(toNumber(simulator.dayIndex, sampled[sampled.length - 1].dayIndex)),
    );
    const cash = Math.max(0, toNumber(simulator.cash, 0));
    values.Cash = cash;

    for (const stock of marketSimStocks) {
      const rawPosition = holdings[stock.symbol];
      if (!isRecord(rawPosition)) {
        continue;
      }
      const shares = Math.max(0, Math.floor(toNumber(rawPosition.shares, 0)));
      if (shares <= 0) {
        continue;
      }
      const value = shares * priceAt(stock.symbol, currentDay);
      values[stock.category] = (values[stock.category] ?? 0) + value;
    }

    const total = Object.values(values).reduce((sum, value) => sum + value, 0);
    const allocationSeries =
      total > 0
        ? Object.entries(values)
            .filter(([, value]) => value > 0)
            .map(([name, value]) => ({
              name,
              value: round1((value / total) * 100),
            }))
            .sort((left, right) => right.value - left.value)
        : [];

    return {
      portfolioSeries,
      allocationSeries,
      returnsSeries,
    };
  } catch {
    return null;
  }
}

function dayFromLabel(label: string) {
  const match = /^D(\d+)$/i.exec(label.trim());
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  return Number.isFinite(day) && day > 0 ? day : null;
}

function latestSeriesDay(series: ChartPoint[]) {
  let latest = 0;
  for (const point of series) {
    const day = dayFromLabel(point.year);
    if (day !== null) {
      latest = Math.max(latest, day);
    }
  }
  return latest;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardView({
  userId,
  profile,
  portfolioSeries,
  allocationSeries,
  returnsSeries,
}: {
  userId: string;
  profile: PlatformProfile;
  portfolioSeries: ChartPoint[];
  allocationSeries: AllocationPoint[];
  returnsSeries: ReturnPoint[];
}) {
  const [localSeries, setLocalSeries] = useState<DashboardSeriesData | null>(null);

  useEffect(() => {
    setLocalSeries(buildLocalSeriesFromStorage(userId));
  }, [userId]);

  const serverSeries = useMemo<DashboardSeriesData>(
    () => ({ portfolioSeries, allocationSeries, returnsSeries }),
    [allocationSeries, portfolioSeries, returnsSeries],
  );

  const activeSeries = useMemo<DashboardSeriesData>(
    () => {
      if (!localSeries) {
        return serverSeries;
      }

      const serverHasAnyData =
        serverSeries.portfolioSeries.length > 0 ||
        serverSeries.allocationSeries.length > 0 ||
        serverSeries.returnsSeries.length > 0;
      if (!serverHasAnyData) {
        return localSeries;
      }

      const localDay = latestSeriesDay(localSeries.portfolioSeries);
      const serverDay = latestSeriesDay(serverSeries.portfolioSeries);
      if (localDay > serverDay) {
        return localSeries;
      }

      if (localSeries.portfolioSeries.length > serverSeries.portfolioSeries.length + 2) {
        return localSeries;
      }

      return serverSeries;
    },
    [localSeries, serverSeries],
  );

  const latestWealth = activeSeries.portfolioSeries[activeSeries.portfolioSeries.length - 1]?.wealth ?? 0;
  const previousWealth = activeSeries.portfolioSeries[activeSeries.portfolioSeries.length - 2]?.wealth ?? 0;
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
              <AreaChart data={activeSeries.portfolioSeries}>
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
            {activeSeries.allocationSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeSeries.allocationSeries}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={92}
                    fill="#22d3ee"
                    label
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No allocation data yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Returns vs Index</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {activeSeries.returnsSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeSeries.returnsSeries}>
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
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No return data yet.
            </div>
          )}
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
