import { runSimulation } from "@/lib/engines/simulation";
import type { DecisionAction, SimulationRun } from "@/lib/types/platform";

export interface NpcInvestor {
  key: "conservative" | "index" | "yolo" | "trend";
  label: string;
  description: string;
  decide: (params: {
    yearIndex: number;
    marketReturn: number;
    marketRegime: string;
    previousAction: DecisionAction | null;
  }) => DecisionAction;
}

export const npcInvestors: NpcInvestor[] = [
  {
    key: "conservative",
    label: "Conservative Bot",
    description: "Protects downside and favors cash during turbulence.",
    decide: ({ marketRegime, marketReturn }) => {
      if (marketRegime === "crash" || marketReturn < -0.1) {
        return "sell";
      }
      if (marketRegime === "recession") {
        return "hold";
      }
      return "rebalance";
    },
  },
  {
    key: "index",
    label: "Index Bot",
    description: "Systematic rebalancing with no market timing.",
    decide: ({ yearIndex }) => {
      if (yearIndex % 2 === 0) {
        return "rebalance";
      }
      return "hold";
    },
  },
  {
    key: "yolo",
    label: "YOLO Bot",
    description: "Chases upside and takes concentrated risk.",
    decide: ({ marketRegime, marketReturn }) => {
      if (marketRegime === "boom" || marketReturn > 0.12) {
        return "buy";
      }
      if (marketRegime === "crash") {
        return "sell";
      }
      return "buy";
    },
  },
  {
    key: "trend",
    label: "Trend Bot",
    description: "Rides momentum and exits when trend breaks.",
    decide: ({ marketReturn, previousAction }) => {
      if (marketReturn > 0.04) {
        return "buy";
      }
      if (marketReturn < -0.08) {
        return "sell";
      }
      return previousAction === "buy" ? "hold" : "rebalance";
    },
  },
];

export function simulateNpcLeaderboard(params: {
  seed: string;
  years: number;
  startingWealth: number;
  yearlyContribution: number;
}) {
  const runs: Array<SimulationRun & { npcKey: string; npcLabel: string }> = [];

  for (const npc of npcInvestors) {
    let previousAction: DecisionAction | null = null;

    const run = runSimulation({
      seed: params.seed,
      years: params.years,
      startingWealth: params.startingWealth,
      yearlyContribution: params.yearlyContribution,
      decisionPolicy: ({ yearIndex, market }) => {
        const action = npc.decide({
          yearIndex,
          marketReturn: market.returnPct,
          marketRegime: market.regime,
          previousAction,
        });
        previousAction = action;
        return action;
      },
    });

    runs.push({
      ...run,
      npcKey: npc.key,
      npcLabel: npc.label,
    });
  }

  return runs.sort((a, b) => b.endingWealth - a.endingWealth);
}
