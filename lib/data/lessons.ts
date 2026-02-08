import type { LessonCard } from "@/lib/types/platform";

export const lessonDeck: LessonCard[] = [
  {
    id: "compound-interest",
    topic: "Compounding",
    concept:
      "Compounding means gains generate future gains. Time in market usually beats timing the market.",
    xpReward: 20,
    question: {
      prompt: "What has the strongest impact on compounding growth?",
      options: [
        "Longer investment horizon",
        "Checking prices hourly",
        "Buying only after big green days",
      ],
      correctIndex: 0,
      explanation:
        "The longer your capital remains invested, the more growth builds on prior growth.",
    },
  },
  {
    id: "diversification",
    topic: "Diversification",
    concept:
      "Diversification spreads exposure across assets so one bad position does not sink the portfolio.",
    xpReward: 18,
    question: {
      prompt: "Diversification mainly helps reduce:",
      options: [
        "Company-specific risk",
        "All market risk",
        "The need to rebalance",
      ],
      correctIndex: 0,
      explanation:
        "Diversification mitigates idiosyncratic risk, but market-wide drawdowns can still happen.",
    },
  },
  {
    id: "rebalancing",
    topic: "Rebalancing",
    concept:
      "Rebalancing restores target allocations and prevents drifting into unintended risk profiles.",
    xpReward: 22,
    question: {
      prompt: "When does rebalancing add the most value?",
      options: [
        "When allocations drift from target",
        "After every up day",
        "Only during crashes",
      ],
      correctIndex: 0,
      explanation:
        "Rebalancing is designed to correct material drift, not react to every short-term move.",
    },
  },
  {
    id: "volatility",
    topic: "Volatility",
    concept:
      "Volatility is price movement range, not permanent loss. Behavior during drawdowns drives outcomes.",
    xpReward: 20,
    question: {
      prompt: "A high-volatility year always means:",
      options: [
        "Large price swings",
        "Negative returns",
        "Strategy failure",
      ],
      correctIndex: 0,
      explanation:
        "Volatility measures movement, not direction. Returns can still be positive in volatile periods.",
    },
  },
];
