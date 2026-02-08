import type { DecisionAction } from "@/lib/types/platform";

export const activityRewards = {
  avatarSetup: { xp: 20, coins: 8 },
  portfolioTemplate: { xp: 18, coins: 7 },
  strategyTemplate: { xp: 22, coins: 9 },
  weeklyReport: { xp: 10, coins: 4 },
} as const;

export const simulationActionRewards: Record<
  DecisionAction,
  { xp: number; coins: number }
> = {
  buy: { xp: 10, coins: 4 },
  hold: { xp: 8, coins: 3 },
  sell: { xp: 5, coins: 2 },
  rebalance: { xp: 12, coins: 5 },
};
