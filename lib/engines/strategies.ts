import { calculateAllocationDrift } from "@/lib/engines/simulation";
import type {
  DecisionAction,
  MarketYear,
  SimulationState,
  StrategyRule,
} from "@/lib/types/platform";

function compare(left: number, operator: StrategyRule["operator"], right: number) {
  if (operator === ">") return left > right;
  if (operator === "<") return left < right;
  if (operator === ">=") return left >= right;
  return left <= right;
}

function marketDropScore(market: MarketYear) {
  return Math.max(0, Math.abs(Math.min(0, market.returnPct)) * 100);
}

export function evaluateRules(params: {
  rules: StrategyRule[];
  market: MarketYear;
  previousState: SimulationState | null;
}): DecisionAction {
  const drift = params.previousState
    ? calculateAllocationDrift(params.previousState.allocation)
    : 0;
  const risk = params.previousState?.risk ?? 50;

  for (const rule of params.rules) {
    let metricValue = 0;

    if (rule.metric === "marketDrop") {
      metricValue = marketDropScore(params.market);
    }

    if (rule.metric === "risk") {
      metricValue = risk;
    }

    if (rule.metric === "allocationDrift") {
      metricValue = drift;
    }

    if (compare(metricValue, rule.operator, rule.value)) {
      return rule.action;
    }
  }

  return "hold";
}
