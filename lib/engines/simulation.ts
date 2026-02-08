import { generateMarketTimeline } from "@/lib/engines/market";
import type {
  Allocation,
  DecisionAction,
  MarketYear,
  SimulationRun,
  SimulationState,
} from "@/lib/types/platform";

interface SimulationConfig {
  seed: string;
  years: number;
  startingWealth: number;
  yearlyContribution: number;
  decisionPolicy?: (params: {
    yearIndex: number;
    market: MarketYear;
    previousState: SimulationState | null;
  }) => DecisionAction;
}

const TARGET_BALANCE: Allocation = { stocks: 50, etf: 35, cash: 15 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeAllocation(allocation: Allocation): Allocation {
  const total = allocation.stocks + allocation.etf + allocation.cash;
  if (total <= 0) {
    return { ...TARGET_BALANCE };
  }

  return {
    stocks: Math.round((allocation.stocks / total) * 100),
    etf: Math.round((allocation.etf / total) * 100),
    cash: clamp(100 - Math.round((allocation.stocks / total) * 100) - Math.round((allocation.etf / total) * 100), 0, 100),
  };
}

function driftFromTarget(allocation: Allocation) {
  return (
    Math.abs(allocation.stocks - TARGET_BALANCE.stocks) +
    Math.abs(allocation.etf - TARGET_BALANCE.etf) +
    Math.abs(allocation.cash - TARGET_BALANCE.cash)
  );
}

export function applyDecisionToAllocation(
  allocation: Allocation,
  action: DecisionAction,
): Allocation {
  let next = { ...allocation };

  if (action === "buy") {
    next = {
      stocks: allocation.stocks + 6,
      etf: allocation.etf + 2,
      cash: allocation.cash - 8,
    };
  }

  if (action === "sell") {
    next = {
      stocks: allocation.stocks - 8,
      etf: allocation.etf - 4,
      cash: allocation.cash + 12,
    };
  }

  if (action === "rebalance") {
    next = {
      stocks: allocation.stocks + (TARGET_BALANCE.stocks - allocation.stocks) * 0.7,
      etf: allocation.etf + (TARGET_BALANCE.etf - allocation.etf) * 0.7,
      cash: allocation.cash + (TARGET_BALANCE.cash - allocation.cash) * 0.7,
    };
  }

  next.stocks = clamp(next.stocks, 0, 100);
  next.etf = clamp(next.etf, 0, 100);
  next.cash = clamp(next.cash, 0, 100);

  return normalizeAllocation(next);
}

function weightedReturn(allocation: Allocation, market: MarketYear) {
  const stockBeta = 1.15;
  const etfBeta = 0.82;
  const cashYield = 0.02;
  const stockContribution = (allocation.stocks / 100) * market.returnPct * stockBeta;
  const etfContribution = (allocation.etf / 100) * market.returnPct * etfBeta;
  const cashContribution = (allocation.cash / 100) * cashYield;
  return stockContribution + etfContribution + cashContribution;
}

function evaluateStress(params: {
  previousStress: number;
  action: DecisionAction;
  market: MarketYear;
  allocation: Allocation;
}) {
  const equityExposure = params.allocation.stocks + params.allocation.etf;
  let stress = params.previousStress;

  stress += params.market.volatility * 35;
  stress += (equityExposure / 100) * 12;

  if (params.market.regime === "crash" && params.action === "sell") {
    stress += 12;
  }

  if (params.market.regime === "crash" && params.action === "buy") {
    stress += 7;
  }

  if (params.action === "rebalance") {
    stress -= 6;
  }

  if (params.market.regime === "normal") {
    stress -= 5;
  }

  return clamp(stress, 0, 100);
}

function evaluateEmotion(previousEmotion: number, market: MarketYear, action: DecisionAction) {
  let emotion = previousEmotion + market.returnPct * 45;

  if (market.regime === "crash" && action === "sell") {
    emotion -= 9;
  }

  if (market.regime === "crash" && action === "hold") {
    emotion += 4;
  }

  if (action === "buy" && market.regime === "boom") {
    emotion += 5;
  }

  return clamp(emotion, 0, 100);
}

function riskScore(allocation: Allocation, market: MarketYear) {
  const equityExposure = allocation.stocks + allocation.etf;
  const concentrationPenalty = Math.abs(allocation.stocks - allocation.etf) / 2;
  return clamp(
    equityExposure * 0.72 + market.volatility * 40 + concentrationPenalty,
    0,
    100,
  );
}

function cagr(startingWealth: number, endingWealth: number, years: number) {
  if (startingWealth <= 0 || years <= 0) {
    return 0;
  }

  const growth = endingWealth / startingWealth;
  if (growth <= 0) {
    return 0;
  }

  return Math.pow(growth, 1 / years) - 1;
}

export function runSimulation(config: SimulationConfig): SimulationRun {
  const timeline = generateMarketTimeline(config.seed, config.years);
  let allocation: Allocation = { stocks: 45, etf: 40, cash: 15 };
  const states: SimulationState[] = [];
  let wealth = config.startingWealth;
  let stress = 28;
  let emotion = 56;

  for (let index = 0; index < timeline.length; index += 1) {
    const market = timeline[index];
    const previousState = states[states.length - 1] ?? null;
    const action =
      config.decisionPolicy?.({
        yearIndex: index,
        market,
        previousState,
      }) ?? "hold";

    allocation = applyDecisionToAllocation(allocation, action);
    const netReturn = weightedReturn(allocation, market);
    wealth = (wealth + config.yearlyContribution) * (1 + netReturn);
    stress = evaluateStress({
      previousStress: stress,
      action,
      market,
      allocation,
    });
    emotion = evaluateEmotion(emotion, market, action);

    states.push({
      year: market.year,
      market,
      action,
      wealth: Number(wealth.toFixed(2)),
      contribution: config.yearlyContribution,
      risk: Number(riskScore(allocation, market).toFixed(2)),
      stress: Number(stress.toFixed(2)),
      emotion: Number(emotion.toFixed(2)),
      allocation: { ...allocation },
    });
  }

  return {
    id: crypto.randomUUID(),
    seed: config.seed,
    years: config.years,
    startingWealth: config.startingWealth,
    yearlyContribution: config.yearlyContribution,
    timeline: states,
    endingWealth: Number(wealth.toFixed(2)),
    cagr: Number(cagr(config.startingWealth, wealth, config.years).toFixed(4)),
  };
}

export function calculateAllocationDrift(allocation: Allocation) {
  return driftFromTarget(allocation);
}
