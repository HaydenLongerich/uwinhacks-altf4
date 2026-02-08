"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { applyProfileProgress } from "@/lib/supabase/progress";
import {
  marketChartRangeDays,
  marketSimPlayableDays,
  marketSimStartDay,
  marketSimStocks,
  marketStockSeriesBySymbol,
  type MarketChartRangeKey,
} from "@/lib/data/market-sim-stocks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STARTING_CASH = 10000;
const STARTING_DAY = marketSimStartDay;
const STORAGE_VERSION = 2;
const SIM_END_DAY = marketSimStartDay + marketSimPlayableDays - 1;
const SIM_START_DATE_UTC = Date.UTC(2025, 0, 1);

type TradeSide = "buy" | "sell";

interface Position {
  shares: number;
  avgCost: number;
}

interface TradeLogEntry {
  id: string;
  dayIndex: number;
  dateLabel: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  cashAfter: number;
}

interface PortfolioPoint {
  dayIndex: number;
  dateLabel: string;
  value: number;
}

interface SimulatorState {
  dayIndex: number;
  cash: number;
  holdings: Record<string, Position>;
  realizedPnl: number;
  tradeLog: TradeLogEntry[];
  portfolioHistory: PortfolioPoint[];
  lastSyncedDay: number;
}

interface StoredSimulatorState {
  version: number;
  simulator: SimulatorState;
}

interface SupabaseInsertResult {
  error: { message?: string } | null;
}

type SupabaseInsertable = {
  from: (table: string) => {
    insert: (payload: Record<string, unknown>) => Promise<SupabaseInsertResult>;
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dayLabel(dayIndex: number) {
  const timestamp = SIM_START_DATE_UTC + dayIndex * 24 * 60 * 60 * 1000;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function emptyHoldings() {
  return marketSimStocks.reduce<Record<string, Position>>((accumulator, stock) => {
    accumulator[stock.symbol] = { shares: 0, avgCost: 0 };
    return accumulator;
  }, {});
}

function priceAt(symbol: string, dayIndex: number) {
  const series = marketStockSeriesBySymbol[symbol] ?? [];
  const safeIndex = clamp(dayIndex, 0, Math.max(0, series.length - 1));
  return series[safeIndex] ?? 0;
}

function portfolioValueAtDay({
  cash,
  holdings,
  dayIndex,
}: {
  cash: number;
  holdings: Record<string, Position>;
  dayIndex: number;
}) {
  const holdingsValue = Object.entries(holdings).reduce((sum, [symbol, position]) => {
    return sum + position.shares * priceAt(symbol, dayIndex);
  }, 0);
  return round2(cash + holdingsValue);
}

function allocationMixAtDay({
  cash,
  holdings,
  dayIndex,
}: {
  cash: number;
  holdings: Record<string, Position>;
  dayIndex: number;
}) {
  const allocationValues: Record<string, number> = {
    Cash: Math.max(0, cash),
  };

  for (const stock of marketSimStocks) {
    const shares = holdings[stock.symbol]?.shares ?? 0;
    if (shares <= 0) {
      continue;
    }
    const value = shares * priceAt(stock.symbol, dayIndex);
    allocationValues[stock.category] = (allocationValues[stock.category] ?? 0) + value;
  }

  const total = Object.values(allocationValues).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return [{ name: "Cash", value: 100 }];
  }

  return Object.entries(allocationValues)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value: Number(((value / total) * 100).toFixed(1)),
    }))
    .sort((left, right) => right.value - left.value);
}

function benchmarkReturnAtDay(dayIndex: number) {
  if (marketSimStocks.length === 0) {
    return 0;
  }

  const startAverage =
    marketSimStocks.reduce((sum, stock) => sum + priceAt(stock.symbol, STARTING_DAY), 0) /
    marketSimStocks.length;
  const currentAverage =
    marketSimStocks.reduce((sum, stock) => sum + priceAt(stock.symbol, dayIndex), 0) /
    marketSimStocks.length;

  if (startAverage <= 0) {
    return 0;
  }

  return ((currentAverage / startAverage) - 1) * 100;
}

function upsertHistoryPoint(history: PortfolioPoint[], point: PortfolioPoint) {
  const last = history[history.length - 1];
  if (!last) {
    return [point];
  }
  if (last.dayIndex === point.dayIndex) {
    return [...history.slice(0, -1), point];
  }
  return [...history, point];
}

function createInitialState(): SimulatorState {
  return {
    dayIndex: STARTING_DAY,
    cash: STARTING_CASH,
    holdings: emptyHoldings(),
    realizedPnl: 0,
    tradeLog: [],
    portfolioHistory: [
      {
        dayIndex: STARTING_DAY,
        dateLabel: dayLabel(STARTING_DAY),
        value: STARTING_CASH,
      },
    ],
    lastSyncedDay: STARTING_DAY,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function missingColumnFromError(errorMessage: string | undefined) {
  if (!errorMessage) {
    return null;
  }
  const match = errorMessage.match(
    /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i,
  );
  return match?.[1] ?? null;
}

function problemColumnFromError(errorMessage: string | undefined) {
  if (!errorMessage) {
    return null;
  }

  const missingColumn = missingColumnFromError(errorMessage);
  if (missingColumn) {
    return missingColumn;
  }

  const nullViolation = errorMessage.match(
    /null value in column\s+"?([a-zA-Z0-9_]+)"?\s+violates/i,
  );
  if (nullViolation?.[1]) {
    return nullViolation[1];
  }

  const invalidInput = errorMessage.match(
    /column\s+"?([a-zA-Z0-9_]+)"?.*invalid input syntax/i,
  );
  if (invalidInput?.[1]) {
    return invalidInput[1];
  }

  return null;
}

async function insertSimulationSnapshotWithFallback({
  supabase,
  payload,
}: {
  supabase: SupabaseInsertable;
  payload: Record<string, unknown>;
}) {
  const payloadCandidates: Record<string, unknown>[] = [
    payload,
    { ...payload, id: undefined },
    {
      user_id: payload.user_id,
      seed: payload.seed,
      years: payload.years,
      starting_wealth: payload.starting_wealth,
      ending_wealth: payload.ending_wealth,
      cagr: payload.cagr,
      timeline_json: payload.timeline_json,
      summary_json: payload.summary_json,
    },
    {
      user_id: payload.user_id,
      seed: payload.seed,
      years: payload.years,
      starting_wealth: payload.starting_wealth,
      ending_wealth: payload.ending_wealth,
      cagr: payload.cagr,
      timeline_json: payload.timeline_json,
    },
    {
      user_id: payload.user_id,
      seed: payload.seed,
      years: payload.years,
      starting_wealth: payload.starting_wealth,
      ending_wealth: payload.ending_wealth,
      cagr: payload.cagr,
    },
    {
      user_id: payload.user_id,
      seed: payload.seed,
      ending_wealth: payload.ending_wealth,
    },
  ];

  let lastError: string | undefined;

  for (const candidate of payloadCandidates) {
    const mutablePayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(candidate)) {
      if (value !== undefined) {
        mutablePayload[key] = value;
      }
    }

    while (Object.keys(mutablePayload).length > 0) {
      const { error } = await supabase.from("simulations").insert(mutablePayload);
      if (!error) {
        return { ok: true as const };
      }

      lastError = error.message;
      const column = problemColumnFromError(error.message);
      if (column && column in mutablePayload) {
        delete mutablePayload[column];
        continue;
      }
      break;
    }
  }

  return {
    ok: false as const,
    error: lastError ?? "Simulation snapshot insert failed.",
  };
}

function restoreState(raw: string | null): SimulatorState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    const version = toNumber(parsed.version, -1);
    if (version !== STORAGE_VERSION) {
      return null;
    }

    const simulator = parsed.simulator;
    if (!isRecord(simulator)) {
      return null;
    }

    const dayIndex = clamp(
      Math.floor(toNumber(simulator.dayIndex, STARTING_DAY)),
      STARTING_DAY,
      SIM_END_DAY,
    );
    const cash = Math.max(0, round2(toNumber(simulator.cash, STARTING_CASH)));
    const realizedPnl = round2(toNumber(simulator.realizedPnl, 0));
    const lastSyncedDay = clamp(
      Math.floor(toNumber(simulator.lastSyncedDay, STARTING_DAY)),
      STARTING_DAY,
      dayIndex,
    );

    const holdings = emptyHoldings();
    if (isRecord(simulator.holdings)) {
      for (const stock of marketSimStocks) {
        const rawPosition = simulator.holdings[stock.symbol];
        if (!isRecord(rawPosition)) {
          continue;
        }
        holdings[stock.symbol] = {
          shares: Math.max(0, Math.floor(toNumber(rawPosition.shares, 0))),
          avgCost: Math.max(0, round2(toNumber(rawPosition.avgCost, 0))),
        };
      }
    }

    const fallbackHistory: PortfolioPoint[] = [
      {
        dayIndex,
        dateLabel: dayLabel(dayIndex),
        value: portfolioValueAtDay({ cash, holdings, dayIndex }),
      },
    ];

    const portfolioHistory: PortfolioPoint[] = Array.isArray(simulator.portfolioHistory)
      ? simulator.portfolioHistory
          .map((entry) => {
            if (!isRecord(entry)) {
              return null;
            }
            const entryDay = clamp(
              Math.floor(toNumber(entry.dayIndex, dayIndex)),
              STARTING_DAY,
              dayIndex,
            );
            return {
              dayIndex: entryDay,
              dateLabel:
                typeof entry.dateLabel === "string" ? entry.dateLabel : dayLabel(entryDay),
              value: Math.max(0, round2(toNumber(entry.value, 0))),
            };
          })
          .filter((entry): entry is PortfolioPoint => Boolean(entry))
      : fallbackHistory;

    const tradeLog: TradeLogEntry[] = Array.isArray(simulator.tradeLog)
      ? simulator.tradeLog
          .map((entry) => {
            if (!isRecord(entry)) {
              return null;
            }
            const side = entry.side === "sell" ? "sell" : entry.side === "buy" ? "buy" : null;
            if (!side) {
              return null;
            }
            const symbol =
              typeof entry.symbol === "string" && entry.symbol.length > 0
                ? entry.symbol
                : marketSimStocks[0].symbol;
            return {
              id:
                typeof entry.id === "string" && entry.id.length > 0
                  ? entry.id
                  : `${symbol}-${Date.now().toString(36)}`,
              dayIndex: clamp(
                Math.floor(toNumber(entry.dayIndex, dayIndex)),
                STARTING_DAY,
                dayIndex,
              ),
              dateLabel:
                typeof entry.dateLabel === "string" && entry.dateLabel.length > 0
                  ? entry.dateLabel
                  : dayLabel(dayIndex),
              symbol,
              side,
              quantity: Math.max(1, Math.floor(toNumber(entry.quantity, 1))),
              price: Math.max(0, round2(toNumber(entry.price, 0))),
              cashAfter: Math.max(0, round2(toNumber(entry.cashAfter, cash))),
            };
          })
          .filter((entry): entry is TradeLogEntry => Boolean(entry))
          .slice(0, 120)
      : [];

    return {
      dayIndex,
      cash,
      holdings,
      realizedPnl,
      tradeLog,
      portfolioHistory: portfolioHistory.length > 0 ? portfolioHistory : fallbackHistory,
      lastSyncedDay,
    };
  } catch {
    return null;
  }
}

export function MarketGameArena({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const storageKey = `altf4-market-sim:${userId}`;

  const [simulator, setSimulator] = useState<SimulatorState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(marketSimStocks[0].symbol);
  const [quantityInput, setQuantityInput] = useState("1");
  const [chartRange, setChartRange] = useState<MarketChartRangeKey>("1M");
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const restored = restoreState(localStorage.getItem(storageKey));
    if (restored) {
      setSimulator(restored);
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const payload: StoredSimulatorState = {
      version: STORAGE_VERSION,
      simulator,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [hydrated, simulator, storageKey]);

  const currentDateLabel = dayLabel(simulator.dayIndex);
  const currentPortfolioValue = portfolioValueAtDay({
    cash: simulator.cash,
    holdings: simulator.holdings,
    dayIndex: simulator.dayIndex,
  });
  const unrealizedPnl = Object.entries(simulator.holdings).reduce((sum, [symbol, position]) => {
    if (position.shares <= 0) {
      return sum;
    }
    const currentPrice = priceAt(symbol, simulator.dayIndex);
    return sum + (currentPrice - position.avgCost) * position.shares;
  }, 0);
  const totalPnl = round2(currentPortfolioValue - STARTING_CASH);
  const totalReturnPct =
    STARTING_CASH > 0 ? (currentPortfolioValue / STARTING_CASH - 1) * 100 : 0;
  const remainingDays = SIM_END_DAY - simulator.dayIndex;
  const seasonDay = simulator.dayIndex - STARTING_DAY + 1;

  const stockRows = useMemo(() => {
    return marketSimStocks.map((stock) => {
      const currentPrice = priceAt(stock.symbol, simulator.dayIndex);
      const previousPrice =
        simulator.dayIndex > 0 ? priceAt(stock.symbol, simulator.dayIndex - 1) : currentPrice;
      const dayChangePct =
        previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
      const position = simulator.holdings[stock.symbol];
      const positionValue = position.shares * currentPrice;
      const positionPnl = (currentPrice - position.avgCost) * position.shares;

      return {
        ...stock,
        currentPrice,
        dayChangePct,
        shares: position.shares,
        avgCost: position.avgCost,
        positionValue,
        positionPnl,
      };
    });
  }, [simulator.dayIndex, simulator.holdings]);

  const selectedPrice = priceAt(selectedSymbol, simulator.dayIndex);

  const stockChartData = useMemo(() => {
    const windowDays = marketChartRangeDays[chartRange];
    const startDay = Math.max(0, simulator.dayIndex - windowDays + 1);
    const endDay = simulator.dayIndex;
    const series = marketStockSeriesBySymbol[selectedSymbol] ?? [];
    return series.slice(startDay, endDay + 1).map((price, offset) => {
      const dayIndex = startDay + offset;
      return {
        label: `D${dayIndex + 1}`,
        price,
      };
    });
  }, [chartRange, selectedSymbol, simulator.dayIndex]);

  const portfolioChartData = useMemo(() => {
    return simulator.portfolioHistory.map((point) => ({
      label: `D${point.dayIndex + 1}`,
      value: round2(point.value),
    }));
  }, [simulator.portfolioHistory]);

  const trade = (side: TradeSide) => {
    const requestedQuantity = Math.max(1, Math.floor(Number(quantityInput) || 0));
    let nextMessage: string | null = null;

    setSimulator((current) => {
      const symbol = selectedSymbol;
      const price = priceAt(symbol, current.dayIndex);
      const existingPosition = current.holdings[symbol];
      let quantity = requestedQuantity;
      let nextCash = current.cash;
      let nextRealizedPnl = current.realizedPnl;
      const nextHoldings = {
        ...current.holdings,
      };

      if (side === "buy") {
        const maxAffordable = Math.floor(current.cash / Math.max(0.01, price));
        quantity = Math.min(quantity, maxAffordable);
        if (quantity <= 0) {
          nextMessage = "Not enough cash for that trade size.";
          return current;
        }

        nextCash = round2(current.cash - quantity * price);
        const totalShares = existingPosition.shares + quantity;
        const weightedCost =
          existingPosition.avgCost * existingPosition.shares + quantity * price;
        nextHoldings[symbol] = {
          shares: totalShares,
          avgCost: totalShares > 0 ? round2(weightedCost / totalShares) : 0,
        };
      } else {
        quantity = Math.min(quantity, existingPosition.shares);
        if (quantity <= 0) {
          nextMessage = "No shares available to sell.";
          return current;
        }

        nextCash = round2(current.cash + quantity * price);
        const remainingShares = existingPosition.shares - quantity;
        nextRealizedPnl = round2(
          current.realizedPnl + (price - existingPosition.avgCost) * quantity,
        );
        nextHoldings[symbol] = {
          shares: remainingShares,
          avgCost: remainingShares > 0 ? existingPosition.avgCost : 0,
        };
      }

      const nextValue = portfolioValueAtDay({
        cash: nextCash,
        holdings: nextHoldings,
        dayIndex: current.dayIndex,
      });

      const nextEntry: TradeLogEntry = {
        id: crypto.randomUUID(),
        dayIndex: current.dayIndex,
        dateLabel: dayLabel(current.dayIndex),
        symbol,
        side,
        quantity,
        price: round2(price),
        cashAfter: nextCash,
      };

      nextMessage = `${side === "buy" ? "Bought" : "Sold"} ${quantity} ${symbol} @ ${formatCurrency(price)}.`;

      return {
        ...current,
        cash: nextCash,
        holdings: nextHoldings,
        realizedPnl: nextRealizedPnl,
        tradeLog: [nextEntry, ...current.tradeLog].slice(0, 120),
        portfolioHistory: upsertHistoryPoint(current.portfolioHistory, {
          dayIndex: current.dayIndex,
          dateLabel: dayLabel(current.dayIndex),
          value: nextValue,
        }),
      };
    });

    setStatus(nextMessage);
  };

  const advanceDay = () => {
    let advanced = false;

    setSimulator((current) => {
      if (current.dayIndex >= SIM_END_DAY) {
        return current;
      }

      const nextDay = current.dayIndex + 1;
      const nextValue = portfolioValueAtDay({
        cash: current.cash,
        holdings: current.holdings,
        dayIndex: nextDay,
      });

      advanced = true;
      return {
        ...current,
        dayIndex: nextDay,
        portfolioHistory: upsertHistoryPoint(current.portfolioHistory, {
          dayIndex: nextDay,
          dateLabel: dayLabel(nextDay),
          value: nextValue,
        }),
      };
    });

    if (advanced) {
      setStatus(null);
    } else {
      setStatus("You reached the end of the 1-year simulation. Reset to start a new season.");
    }
  };

  const resetSimulator = () => {
    localStorage.removeItem(storageKey);
    setSimulator(createInitialState());
    setStatus("Simulator reset to Day 1.");
  };

  const syncRewards = async () => {
    if (simulator.dayIndex <= simulator.lastSyncedDay) {
      setStatus("No new days to sync yet. Advance at least one day first.");
      return;
    }

    setIsSyncing(true);
    setStatus(null);

    const dayDelta = simulator.dayIndex - simulator.lastSyncedDay;
    const performanceBonus = Math.max(0, Math.round(totalReturnPct * 0.7));
    const xp = Math.max(12, Math.min(220, dayDelta * 3 + performanceBonus));
    const coins = Math.max(5, Math.round(xp * 0.45));
    const benchmarkReturnPct = benchmarkReturnAtDay(simulator.dayIndex);
    const allocation = allocationMixAtDay({
      cash: simulator.cash,
      holdings: simulator.holdings,
      dayIndex: simulator.dayIndex,
    });
    const elapsedDays = Math.max(1, seasonDay);
    const growth = currentPortfolioValue / STARTING_CASH;
    const cagr = Math.pow(Math.max(0.0001, growth), 365 / elapsedDays) - 1;
    const snapshotId = crypto.randomUUID();

    const result = await applyProfileProgress({
      supabase,
      userId,
      xpDelta: xp,
      coinsDelta: coins,
      streakDelta: 1,
    });

    if (result.ok) {
      let syncMessage = `Progress synced. +${xp} XP, +${coins} coins.`;

      const snapshotPayload: Record<string, unknown> = {
        id: snapshotId,
        user_id: userId,
        seed: `market-sim-day-${simulator.dayIndex + 1}`,
        years: 1,
        starting_wealth: STARTING_CASH,
        ending_wealth: currentPortfolioValue,
        cagr,
        timeline_json: simulator.portfolioHistory.map((point) => ({
          day: point.dayIndex + 1,
          label: point.dateLabel,
          value: point.value,
        })),
        summary_json: {
          mode: "market_sim_persistent",
          xp,
          coins,
          returnPct: Number(totalReturnPct.toFixed(2)),
          benchmarkReturnPct: Number(benchmarkReturnPct.toFixed(2)),
          realizedPnl: Number(simulator.realizedPnl.toFixed(2)),
          unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
          allocation,
          syncedAt: new Date().toISOString(),
          day: seasonDay,
        },
      };

      try {
        const insertResult = await insertSimulationSnapshotWithFallback({
          supabase: supabase as unknown as SupabaseInsertable,
          payload: snapshotPayload,
        });

        if (!insertResult.ok) {
          syncMessage += " Rewards saved, but run history could not be stored.";
        }
      } catch {
        syncMessage += " Rewards saved, but run history could not be stored.";
      }

      setSimulator((current) => ({
        ...current,
        lastSyncedDay: current.dayIndex,
      }));
      setStatus(syncMessage);
      router.refresh();
    } else {
      setStatus(
        result.storageReady
          ? `Could not sync rewards: ${result.error ?? "profile update failed"}`
          : "Could not sync rewards to profile storage right now.",
      );
    }

    setIsSyncing(false);
  };

  return (
    <div className="space-y-5">
      <Card className="border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Persistent Market Simulator</CardTitle>
          <Badge variant="outline">
            Day {seasonDay} / {marketSimPlayableDays} | {currentDateLabel}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Cash</p>
            <p className="font-semibold">{formatCurrency(simulator.cash)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Portfolio Value</p>
            <p className="font-semibold">{formatCurrency(currentPortfolioValue)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Total PnL</p>
            <p className={`font-semibold ${totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCurrency(totalPnl)} ({formatPct(totalReturnPct)})
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Realized PnL</p>
            <p
              className={`font-semibold ${
                simulator.realizedPnl >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(simulator.realizedPnl)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Unrealized PnL</p>
            <p className={`font-semibold ${unrealizedPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCurrency(unrealizedPnl)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card className="border-slate-200 bg-white">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Stock Chart</CardTitle>
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                {(Object.keys(marketChartRangeDays) as MarketChartRangeKey[]).map((range) => (
                  <Button
                    key={range}
                    type="button"
                    variant={chartRange === range ? "default" : "ghost"}
                    className={
                      chartRange === range
                        ? "rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                        : "rounded-full text-slate-700 hover:bg-slate-100"
                    }
                    onClick={() => setChartRange(range)}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_160px]">
              <label className="space-y-1 text-xs text-slate-600">
                Symbol
                <select
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                  value={selectedSymbol}
                  onChange={(event) => setSelectedSymbol(event.target.value)}
                >
                  {marketSimStocks.map((stock) => (
                    <option key={stock.symbol} value={stock.symbol}>
                      {stock.symbol} - {stock.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Current Price</p>
                <p className="font-semibold">{formatCurrency(selectedPrice)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-72 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stockChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="label" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="#06b6d4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-end">
              <label className="space-y-1 text-xs text-slate-600">
                Quantity
                <Input
                  type="number"
                  min={1}
                  value={quantityInput}
                  onChange={(event) => setQuantityInput(event.target.value)}
                  className="border-slate-200 bg-slate-50"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  onClick={() => trade("buy")}
                  className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Buy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => trade("sell")}
                  className="border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100"
                >
                  Sell
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={advanceDay}
                  className="border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100"
                >
                  Next Day
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={syncRewards}
                disabled={isSyncing || simulator.dayIndex <= simulator.lastSyncedDay}
                className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
              >
                {isSyncing ? "Syncing..." : "Sync Rewards"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetSimulator}
                className="border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100"
              >
                New Season
              </Button>
              <span className="self-center text-xs text-slate-500">
                Auto-save: {hydrated ? "on" : "loading"} | Remaining days: {remainingDays}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Portfolio Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-72 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={portfolioChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="label" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#0ea5e9" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-600">
              Simulation uses synthetic prices with realistic-style volatility. Track performance
              across sessions and build positions over time.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Watchlist + Positions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stockRows.map((row) => (
            <div
              key={row.symbol}
              className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-[1.3fr_0.9fr_0.9fr_1fr_1fr_1fr]"
            >
              <div>
                <p className="font-semibold">
                  {row.symbol} <span className="font-normal text-slate-500">| {row.name}</span>
                </p>
                <p className="text-xs text-slate-500">{row.category}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Price</p>
                <p className="font-medium">{formatCurrency(row.currentPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">1D</p>
                <p className={row.dayChangePct >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  {formatPct(row.dayChangePct)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Shares</p>
                <p className="font-medium">{row.shares}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Position</p>
                <p className="font-medium">{formatCurrency(row.positionValue)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Position PnL</p>
                <p className={row.positionPnl >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  {formatCurrency(row.positionPnl)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Trade Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {simulator.tradeLog.length === 0 ? (
            <p className="text-sm text-slate-600">No trades yet. Start building positions.</p>
          ) : (
            simulator.tradeLog.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium uppercase">
                    {entry.side} {entry.quantity} {entry.symbol}
                  </p>
                  <span className="text-xs text-slate-500">
                    Day {entry.dayIndex + 1} | {entry.dateLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Price {formatCurrency(entry.price)} | Cash after {formatCurrency(entry.cashAfter)}
                </p>
              </div>
            ))
          )}
          {status ? <p className="text-xs text-slate-700">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
