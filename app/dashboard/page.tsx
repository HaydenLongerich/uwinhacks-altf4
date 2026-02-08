import { DashboardView } from "@/components/dashboard/dashboard-view";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";
import type { PlatformProfile } from "@/lib/types/platform";

function buildDashboardSeries(profile: PlatformProfile) {
  const yearlyReturns = [0.08, 0.12, -0.06, 0.15, 0.07, 0.1, -0.04, 0.13];
  const benchmarkReturns = [0.06, 0.09, -0.08, 0.11, 0.05, 0.08, -0.05, 0.1];
  const contribution = 4500 + Math.min(3500, profile.level * 150);
  const initialWealth = 12000 + profile.coins * 5 + profile.level * 600;

  let userWealth = initialWealth;
  let benchmarkWealth = initialWealth;

  const portfolioSeries: Array<{ year: string; wealth: number }> = [];
  const returnsSeries: Array<{ year: string; user: number; index: number }> = [];

  yearlyReturns.forEach((userReturn, idx) => {
    const benchmarkReturn = benchmarkReturns[idx] ?? 0;

    userWealth = (userWealth + contribution) * (1 + userReturn);
    benchmarkWealth = (benchmarkWealth + contribution) * (1 + benchmarkReturn);

    portfolioSeries.push({
      year: `Y${idx + 1}`,
      wealth: Math.round(userWealth),
    });

    returnsSeries.push({
      year: `Y${idx + 1}`,
      user: Number((((userWealth / initialWealth) - 1) * 100).toFixed(1)),
      index: Number((((benchmarkWealth / initialWealth) - 1) * 100).toFixed(1)),
    });
  });

  const stocks = Math.max(25, Math.min(70, Math.round(profile.riskTolerance)));
  const cash = Math.max(
    10,
    Math.min(30, Math.round((100 - profile.patience) / 2)),
  );
  const etf = Math.max(5, 100 - stocks - cash);
  const adjustedCash = Math.max(0, 100 - stocks - etf);

  const allocationSeries = [
    { name: "Stocks", value: stocks },
    { name: "ETF", value: etf },
    { name: "Cash", value: adjustedCash },
  ];

  return {
    portfolioSeries,
    allocationSeries,
    returnsSeries,
  };
}

export default async function DashboardPage() {
  const { user, profile } = await requireUserProfile();
  const { portfolioSeries, allocationSeries, returnsSeries } =
    buildDashboardSeries(profile);

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <DashboardView
        profile={profile}
        portfolioSeries={portfolioSeries}
        allocationSeries={allocationSeries}
        returnsSeries={returnsSeries}
      />
    </AppShell>
  );
}
