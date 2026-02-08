import { DashboardView } from "@/components/dashboard/dashboard-view";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

interface DashboardSeries {
  portfolioSeries: Array<{ year: string; wealth: number }>;
  allocationSeries: Array<{ name: string; value: number }>;
  returnsSeries: Array<{ year: string; user: number; index: number }>;
}

interface QueryError {
  message?: string;
}

interface QueryResult {
  data?: unknown[] | null;
  error?: QueryError | null;
}

type SimulationsQueryBuilder = {
  select: (columns: string) => SimulationsQueryBuilder;
  eq: (column: string, value: string) => SimulationsQueryBuilder;
  order: (
    column: string,
    options: { ascending: boolean },
  ) => SimulationsQueryBuilder;
  limit: (count: number) => Promise<QueryResult>;
};

type DashboardSupabase = {
  from: (table: string) => unknown;
};

interface SimulationSnapshot {
  id: string;
  seed: string;
  mode: string | null;
  runOrder: number;
  createdAtMs: number;
  startingWealth: number;
  endingWealth: number;
  cagr: number;
  timeline: unknown[];
  allocationSeries: Array<{ name: string; value: number }> | null;
  indexReturnPct: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toTimestamp(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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

function looksLikeMissingColumn(errorMessage: string | undefined, column: string) {
  if (!errorMessage) {
    return false;
  }
  const lower = errorMessage.toLowerCase();
  return (
    lower.includes("column") &&
    lower.includes(column.toLowerCase()) &&
    (lower.includes("does not exist") || lower.includes("schema cache"))
  );
}

function simulationsTable(supabase: DashboardSupabase) {
  return supabase.from("simulations") as SimulationsQueryBuilder;
}

function parseAllocationFromSummary(summary: Record<string, unknown>) {
  const allocation = summary.allocation;
  if (!Array.isArray(allocation)) {
    return null;
  }

  const parsed = allocation
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }
      const name = typeof entry.name === "string" ? entry.name : null;
      const value = toNumber(entry.value, -1);
      if (!name || value <= 0) {
        return null;
      }
      return {
        name,
        value: round1(value),
      };
    })
    .filter((entry): entry is { name: string; value: number } => Boolean(entry));

  return parsed.length > 0 ? parsed : null;
}

function parseAllocationFromTimeline(timeline: unknown[]) {
  if (timeline.length === 0) {
    return null;
  }
  const lastPoint = timeline[timeline.length - 1];
  if (!isRecord(lastPoint) || !isRecord(lastPoint.allocation)) {
    return null;
  }

  const allocation = lastPoint.allocation;
  const stocks = Math.max(0, toNumber(allocation.stocks, 0));
  const etf = Math.max(0, toNumber(allocation.etf, 0));
  const cash = Math.max(0, toNumber(allocation.cash, 0));
  const total = stocks + etf + cash;

  if (total <= 0) {
    return null;
  }

  return [
    { name: "Stocks", value: round1((stocks / total) * 100) },
    { name: "ETF", value: round1((etf / total) * 100) },
    { name: "Cash", value: round1((cash / total) * 100) },
  ].filter((entry) => entry.value > 0);
}

function parseIndexReturnFromTimeline(timeline: unknown[]) {
  if (timeline.length === 0) {
    return null;
  }

  let hasData = false;
  let growth = 1;

  for (const point of timeline) {
    if (!isRecord(point) || !isRecord(point.market)) {
      continue;
    }
    const returnPct = toNumber(point.market.returnPct, Number.NaN);
    if (!Number.isFinite(returnPct)) {
      continue;
    }
    growth *= 1 + returnPct;
    hasData = true;
  }

  if (!hasData) {
    return null;
  }

  return round2((growth - 1) * 100);
}

function parsePortfolioSeriesFromTimeline(timeline: unknown[]) {
  if (timeline.length === 0) {
    return [];
  }

  const firstPoint = timeline[0];
  if (!isRecord(firstPoint)) {
    return [];
  }

  if (typeof firstPoint.wealth === "number") {
    return compressSeries(
      timeline
        .map((point, index) => {
          if (!isRecord(point) || typeof point.wealth !== "number") {
            return null;
          }
          return {
            year:
              typeof point.year === "number" ? `Y${point.year}` : `Y${index + 1}`,
            wealth: Math.round(point.wealth),
          };
        })
        .filter((point): point is { year: string; wealth: number } => Boolean(point)),
    );
  }

  if (typeof firstPoint.value === "number") {
    return compressSeries(
      timeline
        .map((point, index) => {
          if (!isRecord(point) || typeof point.value !== "number") {
            return null;
          }
          const day =
            typeof point.day === "number" ? Math.max(1, Math.round(point.day)) : index + 1;
          return {
            year: `D${day}`,
            wealth: Math.round(point.value),
          };
        })
        .filter((point): point is { year: string; wealth: number } => Boolean(point)),
    );
  }

  if (typeof firstPoint.portfolio === "number") {
    return compressSeries(
      timeline
        .map((point, index) => {
          if (!isRecord(point) || typeof point.portfolio !== "number") {
            return null;
          }
          const label =
            typeof point.label === "string" && point.label.length > 0
              ? point.label
              : `T${index + 1}`;
          return {
            year: label,
            wealth: Math.round(point.portfolio),
          };
        })
        .filter((point): point is { year: string; wealth: number } => Boolean(point)),
    );
  }

  return [];
}

function parseRunOrderFromSeed(seed: string) {
  const match = /^market-sim-day-(\d+)$/i.exec(seed.trim());
  if (!match) {
    return 0;
  }
  const day = Number(match[1]);
  return Number.isFinite(day) && day > 0 ? Math.floor(day) : 0;
}

function parseLastTimelineDay(timeline: unknown[]) {
  let latest = 0;
  for (const point of timeline) {
    if (!isRecord(point)) {
      continue;
    }
    const day = toNumber(point.day, Number.NaN);
    if (!Number.isFinite(day)) {
      continue;
    }
    latest = Math.max(latest, Math.floor(day));
  }
  return latest;
}

function parseSimulationSnapshot(row: Record<string, unknown>): SimulationSnapshot | null {
  const id = typeof row.id === "string" ? row.id : null;
  if (!id) {
    return null;
  }
  const seed = typeof row.seed === "string" ? row.seed : "";

  const summary = isRecord(row.summary_json) ? row.summary_json : {};
  const timeline = Array.isArray(row.timeline_json) ? row.timeline_json : [];
  const mode = typeof summary.mode === "string" ? summary.mode : null;
  const summaryDay = Math.max(0, Math.floor(toNumber(summary.day, 0)));
  const seedDay = parseRunOrderFromSeed(seed);
  const timelineDay = parseLastTimelineDay(timeline);
  const runOrder = Math.max(summaryDay, seedDay, timelineDay);

  const startingWealth = Math.max(0, toNumber(row.starting_wealth, 0));
  const endingWealth = Math.max(0, toNumber(row.ending_wealth, 0));
  const cagr = toNumber(row.cagr, 0);

  const createdAtMs = Math.max(
    toTimestamp(row.created_at),
    toTimestamp(summary.syncedAt),
    toTimestamp(summary.createdAt),
    toTimestamp(summary.created_at),
  );

  const allocationSeries =
    parseAllocationFromSummary(summary) ?? parseAllocationFromTimeline(timeline);

  const indexReturnPct =
    (typeof summary.indexReturnPct === "number" && Number.isFinite(summary.indexReturnPct)
      ? round2(summary.indexReturnPct)
      : null) ??
    (typeof summary.benchmarkReturnPct === "number" &&
    Number.isFinite(summary.benchmarkReturnPct)
      ? round2(summary.benchmarkReturnPct)
      : null) ??
    parseIndexReturnFromTimeline(timeline);

  return {
    id,
    seed,
    mode,
    runOrder,
    createdAtMs,
    startingWealth,
    endingWealth,
    cagr,
    timeline,
    allocationSeries,
    indexReturnPct,
  };
}

async function loadSimulationRows(supabase: DashboardSupabase, userId: string) {
  const ordered = await simulationsTable(supabase)
    .select(
      "id, seed, years, starting_wealth, ending_wealth, cagr, timeline_json, summary_json, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(120);

  if (!ordered.error) {
    return ordered.data ?? [];
  }

  if (!looksLikeMissingColumn(ordered.error?.message, "created_at")) {
    return [];
  }

  const fallback = await simulationsTable(supabase)
    .select("id, seed, years, starting_wealth, ending_wealth, cagr, timeline_json, summary_json")
    .eq("user_id", userId)
    .limit(120);

  if (fallback.error) {
    return [];
  }

  return fallback.data ?? [];
}

async function buildDashboardSeries({
  supabase,
  userId,
}: {
  supabase: DashboardSupabase;
  userId: string;
}): Promise<DashboardSeries> {
  const rows = await loadSimulationRows(supabase, userId);
  const snapshots = rows
    .map((row: unknown) => (isRecord(row) ? parseSimulationSnapshot(row) : null))
    .filter((snapshot: SimulationSnapshot | null): snapshot is SimulationSnapshot =>
      Boolean(snapshot),
    )
    .sort((left: SimulationSnapshot, right: SimulationSnapshot) => {
      if (left.runOrder !== right.runOrder) {
        return left.runOrder - right.runOrder;
      }
      if (left.createdAtMs !== right.createdAtMs) {
        return left.createdAtMs - right.createdAtMs;
      }
      if (left.endingWealth !== right.endingWealth) {
        return left.endingWealth - right.endingWealth;
      }
      return left.id.localeCompare(right.id);
    });

  const validSnapshots = snapshots.filter(
    (snapshot: SimulationSnapshot) =>
      snapshot.timeline.length > 0 ||
      snapshot.endingWealth > 0 ||
      snapshot.startingWealth > 0,
  );

  const prioritizedSnapshots = validSnapshots.filter(
    (snapshot: SimulationSnapshot) =>
      snapshot.mode === "market_sim_persistent" ||
      snapshot.seed.startsWith("market-sim-day-"),
  );
  const sourceSnapshots =
    prioritizedSnapshots.length > 0 ? prioritizedSnapshots : validSnapshots;

  if (sourceSnapshots.length === 0) {
    return {
      portfolioSeries: [],
      allocationSeries: [],
      returnsSeries: [],
    };
  }

  const latestSnapshot = sourceSnapshots[sourceSnapshots.length - 1];
  const latestTimelineSeries = parsePortfolioSeriesFromTimeline(latestSnapshot.timeline);
  const portfolioSeries =
    latestTimelineSeries.length > 0
      ? latestTimelineSeries
      : sourceSnapshots.map((snapshot: SimulationSnapshot, index: number) => ({
          year: `Run ${index + 1}`,
          wealth: Math.round(snapshot.endingWealth),
        }));

  const allocationSeries = latestSnapshot.allocationSeries ?? [];

  const recentSnapshots = sourceSnapshots.slice(
    Math.max(0, sourceSnapshots.length - 12),
  );
  const returnsSeries = recentSnapshots.map((snapshot: SimulationSnapshot, index: number) => {
    const userReturn =
      snapshot.startingWealth > 0
        ? ((snapshot.endingWealth / snapshot.startingWealth) - 1) * 100
        : snapshot.cagr * 100;

    return {
      year: `Run ${index + 1}`,
      user: round2(userReturn),
      index: round2(snapshot.indexReturnPct ?? 0),
    };
  });

  return {
    portfolioSeries,
    allocationSeries,
    returnsSeries,
  };
}

export default async function DashboardPage() {
  const { user, profile, supabase } = await requireUserProfile();
  const { portfolioSeries, allocationSeries, returnsSeries } = await buildDashboardSeries({
    supabase,
    userId: user.id,
  });

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <DashboardView
        userId={user.id}
        profile={profile}
        portfolioSeries={portfolioSeries}
        allocationSeries={allocationSeries}
        returnsSeries={returnsSeries}
      />
    </AppShell>
  );
}
