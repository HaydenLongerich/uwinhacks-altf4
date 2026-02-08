export type DecisionAction = "buy" | "hold" | "sell" | "rebalance";

export type MarketRegime = "normal" | "boom" | "crash" | "recession";

export type AssetType = "etf" | "stocks" | "cash";

export interface Allocation {
  etf: number;
  stocks: number;
  cash: number;
}

export interface MarketYear {
  year: number;
  regime: MarketRegime;
  returnPct: number;
  volatility: number;
  headline: string;
}

export interface YearDecision {
  year: number;
  action: DecisionAction;
  reason?: string;
}

export interface SimulationState {
  year: number;
  wealth: number;
  contribution: number;
  risk: number;
  stress: number;
  emotion: number;
  allocation: Allocation;
  market: MarketYear;
  action: DecisionAction;
}

export interface SimulationRun {
  id: string;
  seed: string;
  years: number;
  startingWealth: number;
  yearlyContribution: number;
  timeline: SimulationState[];
  endingWealth: number;
  cagr: number;
}

export interface BehaviorScores {
  discipline: number;
  panic: number;
  consistency: number;
  riskTolerance: number;
  patience: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  xp: number;
  coins: number;
  cadence: "daily" | "weekly";
  completed?: boolean;
}

export interface LessonQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonCard {
  id: string;
  topic: string;
  concept: string;
  question: LessonQuestion;
  xpReward: number;
}

export interface PlatformProfile {
  userId: string;
  username: string;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  streakFreezes: number;
  discipline: number;
  riskTolerance: number;
  patience: number;
  avatarCompleted: boolean;
  avatarConfig: Record<string, unknown> | null;
}

export interface RewardBadge {
  key: string;
  name: string;
  description: string;
}

export interface StrategyRule {
  id: string;
  metric: "marketDrop" | "risk" | "allocationDrift";
  operator: ">" | "<" | ">=" | "<=";
  value: number;
  action: DecisionAction;
}
