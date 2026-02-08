import type {
  RewardBadge,
  SimulationState,
  YearDecision,
} from "@/lib/types/platform";

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}

export function xpForNextLevel(level: number) {
  return Math.pow(Math.max(level, 1), 2) * 100;
}

export function progressToNextLevel(xp: number) {
  const currentLevel = levelFromXp(xp);
  const currentFloor = xpForNextLevel(currentLevel - 1);
  const nextFloor = xpForNextLevel(currentLevel);
  return {
    currentLevel,
    currentFloor,
    nextFloor,
    ratio:
      nextFloor === currentFloor
        ? 1
        : (xp - currentFloor) / (nextFloor - currentFloor),
  };
}

export function scoreDecisionXp(decisions: YearDecision[]) {
  return decisions.reduce((sum, decision) => {
    if (decision.action === "rebalance") {
      return sum + 12;
    }
    if (decision.action === "hold") {
      return sum + 8;
    }
    if (decision.action === "buy") {
      return sum + 10;
    }
    return sum + 5;
  }, 0);
}

export function scoreCoins(decisions: YearDecision[]) {
  return decisions.reduce((sum, decision) => {
    if (decision.action === "rebalance") {
      return sum + 5;
    }
    if (decision.action === "hold") {
      return sum + 3;
    }
    if (decision.action === "buy") {
      return sum + 4;
    }
    return sum + 2;
  }, 0);
}

export function evaluateBadges(timeline: SimulationState[]): RewardBadge[] {
  const badges: RewardBadge[] = [];
  const crashYears = timeline.filter((year) => year.market.regime === "crash");
  const panicSells = crashYears.filter((year) => year.action === "sell").length;
  const rebalanceCount = timeline.filter((year) => year.action === "rebalance").length;
  const averageStress =
    timeline.reduce((sum, year) => sum + year.stress, 0) / timeline.length;

  if (crashYears.length > 0 && panicSells === 0) {
    badges.push({
      key: "diamond-hands",
      name: "Diamond Hands",
      description: "No panic sell during crash years.",
    });
  }

  if (rebalanceCount >= Math.ceil(timeline.length * 0.4)) {
    badges.push({
      key: "allocator",
      name: "Allocator",
      description: "Rebalanced consistently across the cycle.",
    });
  }

  if (averageStress < 40) {
    badges.push({
      key: "ice-veins",
      name: "Ice Veins",
      description: "Maintained low stress through volatility.",
    });
  }

  if (timeline[timeline.length - 1]?.wealth > timeline[0]?.wealth * 2) {
    badges.push({
      key: "double-up",
      name: "Double Up",
      description: "Doubled your portfolio over the simulation.",
    });
  }

  return badges;
}
