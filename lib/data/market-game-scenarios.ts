export interface MarketGameStep {
  turn: number;
  label: string;
  price: number;
  headline: string;
}

export interface MarketGameScenario {
  id: string;
  name: string;
  ticker: string;
  description: string;
  xpReward: number;
  coinsReward: number;
  steps: MarketGameStep[];
}

export const marketGameScenarios: MarketGameScenario[] = [
  {
    id: "mgs-pandemic-rebound",
    name: "Pandemic Shock & Rebound",
    ticker: "SPY",
    description:
      "Navigate a fast crash and recovery cycle inspired by 2020 market behavior.",
    xpReward: 70,
    coinsReward: 34,
    steps: [
      { turn: 1, label: "W1", price: 330, headline: "Market opens stable." },
      { turn: 2, label: "W2", price: 315, headline: "Risk-off sentiment rises." },
      { turn: 3, label: "W3", price: 288, headline: "Global panic selloff accelerates." },
      { turn: 4, label: "W4", price: 252, headline: "Liquidity fears spike volatility." },
      { turn: 5, label: "W5", price: 268, headline: "Central bank support announced." },
      { turn: 6, label: "W6", price: 282, headline: "Buyers start stepping in." },
      { turn: 7, label: "W7", price: 299, headline: "Confidence improves slowly." },
      { turn: 8, label: "W8", price: 313, headline: "Momentum continues upward." },
      { turn: 9, label: "W9", price: 322, headline: "Recovery broadens across sectors." },
      { turn: 10, label: "W10", price: 334, headline: "Risk appetite returns." },
    ],
  },
  {
    id: "mgs-rate-hike-cycle",
    name: "Rate Hike Rollercoaster",
    ticker: "QQQ",
    description:
      "Handle inflation scares, policy shifts, and growth-stock volatility.",
    xpReward: 74,
    coinsReward: 36,
    steps: [
      { turn: 1, label: "M1", price: 370, headline: "Tech sentiment starts strong." },
      { turn: 2, label: "M2", price: 356, headline: "Inflation print surprises high." },
      { turn: 3, label: "M3", price: 341, headline: "Hawkish policy commentary weighs." },
      { turn: 4, label: "M4", price: 325, headline: "Valuation compression continues." },
      { turn: 5, label: "M5", price: 332, headline: "Short-covering bounce begins." },
      { turn: 6, label: "M6", price: 318, headline: "Second inflation shock hits." },
      { turn: 7, label: "M7", price: 326, headline: "Defensive rotation slows decline." },
      { turn: 8, label: "M8", price: 339, headline: "Policy pace expectations soften." },
      { turn: 9, label: "M9", price: 351, headline: "Mega-cap earnings surprise up." },
      { turn: 10, label: "M10", price: 360, headline: "Trend stabilizes into close." },
    ],
  },
  {
    id: "mgs-ai-boom-correction",
    name: "AI Boom and Pullback",
    ticker: "NVDA",
    description:
      "Ride a momentum rally, then survive a sharp sentiment-driven correction.",
    xpReward: 78,
    coinsReward: 38,
    steps: [
      { turn: 1, label: "Q1", price: 430, headline: "AI demand narrative strengthens." },
      { turn: 2, label: "Q2", price: 448, headline: "Revenue guidance beats estimates." },
      { turn: 3, label: "Q3", price: 476, headline: "Analysts raise price targets." },
      { turn: 4, label: "Q4", price: 505, headline: "Momentum funds pile in." },
      { turn: 5, label: "Q5", price: 532, headline: "Overheated sentiment warning signs." },
      { turn: 6, label: "Q6", price: 498, headline: "Profit-taking wave begins." },
      { turn: 7, label: "Q7", price: 472, headline: "Volatility spikes after downgrade." },
      { turn: 8, label: "Q8", price: 484, headline: "Dip-buyers test support." },
      { turn: 9, label: "Q9", price: 501, headline: "Stabilization in late session." },
      { turn: 10, label: "Q10", price: 516, headline: "Trend resumes with caution." },
    ],
  },
];
