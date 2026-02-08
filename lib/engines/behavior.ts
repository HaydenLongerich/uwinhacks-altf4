import type { BehaviorScores, SimulationState } from "@/lib/types/platform";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function scoreBehavior(timeline: SimulationState[]): BehaviorScores {
  if (timeline.length === 0) {
    return {
      discipline: 50,
      panic: 50,
      consistency: 50,
      riskTolerance: 50,
      patience: 50,
    };
  }

  const crashYears = timeline.filter((state) => state.market.regime === "crash");
  const sellsInCrash = crashYears.filter((state) => state.action === "sell").length;
  const buysInCrash = crashYears.filter((state) => state.action === "buy").length;
  const rebalances = timeline.filter((state) => state.action === "rebalance").length;

  let actionChanges = 0;
  for (let index = 1; index < timeline.length; index += 1) {
    if (timeline[index].action !== timeline[index - 1].action) {
      actionChanges += 1;
    }
  }

  const avgRisk =
    timeline.reduce((sum, year) => sum + year.risk, 0) / timeline.length;
  const avgStress =
    timeline.reduce((sum, year) => sum + year.stress, 0) / timeline.length;
  const avgCash =
    timeline.reduce((sum, year) => sum + year.allocation.cash, 0) / timeline.length;

  const discipline = clamp(
    55 + rebalances * 2 + buysInCrash * 5 - sellsInCrash * 10 - actionChanges,
    0,
    100,
  );

  const panic = clamp(
    35 + sellsInCrash * 20 + Math.max(0, avgStress - 55) - rebalances * 2,
    0,
    100,
  );

  const consistency = clamp(
    78 - actionChanges * 4 + rebalances * 3,
    0,
    100,
  );

  const riskTolerance = clamp(65 + (avgRisk - 50) * 1.1 - avgCash * 0.3, 0, 100);
  const patience = clamp(70 - panic * 0.3 + discipline * 0.4, 0, 100);

  return {
    discipline: Number(discipline.toFixed(1)),
    panic: Number(panic.toFixed(1)),
    consistency: Number(consistency.toFixed(1)),
    riskTolerance: Number(riskTolerance.toFixed(1)),
    patience: Number(patience.toFixed(1)),
  };
}

export function inferInvestorPersona(scores: BehaviorScores) {
  if (scores.panic < 30 && scores.discipline > 70) {
    return "Stoic Compounder";
  }

  if (scores.riskTolerance > 70 && scores.consistency < 45) {
    return "Momentum Chaser";
  }

  if (scores.discipline > 65 && scores.patience > 65) {
    return "Systematic Allocator";
  }

  if (scores.panic > 65) {
    return "Headline Reactor";
  }

  return "Adaptive Builder";
}

export function buildCoachAdvice(scores: BehaviorScores) {
  const advice: string[] = [];

  if (scores.panic > 60) {
    advice.push("Set a crash playbook before volatility spikes to reduce panic-driven sells.");
  }

  if (scores.discipline < 55) {
    advice.push("Use monthly auto-invest and scheduled rebalancing to improve discipline.");
  }

  if (scores.consistency < 50) {
    advice.push("Too many strategy pivots reduce edge. Keep one rule-set for at least one full cycle.");
  }

  if (scores.riskTolerance > 80) {
    advice.push("Your risk appetite is high. Add a downside guardrail to avoid emotional drawdowns.");
  }

  if (advice.length === 0) {
    advice.push("Current behavior is strong. Focus on consistency and long-horizon contributions.");
  }

  return advice;
}
