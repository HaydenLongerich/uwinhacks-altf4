export interface ChartPracticeDrill {
  id: string;
  title: string;
  ticker: string;
  context: string;
  series: Array<{ step: string; price: number }>;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
  coinsReward: number;
}

export const chartPracticeDeck: ChartPracticeDrill[] = [
  {
    id: "cp-trend-breakout",
    title: "Breakout Confirmation",
    ticker: "AAPL",
    context: "Large-cap tech stock pushes above a multi-week range after earnings.",
    series: [
      { step: "D1", price: 174 },
      { step: "D2", price: 173 },
      { step: "D3", price: 175 },
      { step: "D4", price: 176 },
      { step: "D5", price: 180 },
      { step: "D6", price: 184 },
      { step: "D7", price: 186 },
    ],
    prompt: "What does this pattern suggest?",
    options: [
      "Momentum is strengthening after resistance broke.",
      "The stock is likely in a long-term collapse.",
      "Price action is flat and directionless.",
      "Volume is guaranteed to dry up immediately.",
    ],
    correctIndex: 0,
    explanation:
      "The move from consolidation into higher highs points to a bullish breakout with momentum support.",
    xpReward: 24,
    coinsReward: 14,
  },
  {
    id: "cp-panic-sell",
    title: "Shock Drop Reaction",
    ticker: "SPY",
    context: "Index ETF drops sharply after surprise macro data, then stabilizes.",
    series: [
      { step: "D1", price: 516 },
      { step: "D2", price: 512 },
      { step: "D3", price: 503 },
      { step: "D4", price: 498 },
      { step: "D5", price: 501 },
      { step: "D6", price: 504 },
      { step: "D7", price: 507 },
    ],
    prompt: "Which behavior risk is most likely here?",
    options: [
      "FOMO buying after euphoria.",
      "Panic selling at local lows.",
      "Ignoring all risk controls.",
      "Over-diversifying cash holdings.",
    ],
    correctIndex: 1,
    explanation:
      "Sharp drawdowns often trigger emotion-led exits right before partial recoveries begin.",
    xpReward: 22,
    coinsReward: 13,
  },
  {
    id: "cp-sideways-chop",
    title: "Sideways Market",
    ticker: "MSFT",
    context: "Price oscillates in a narrow range for two weeks.",
    series: [
      { step: "D1", price: 402 },
      { step: "D2", price: 399 },
      { step: "D3", price: 401 },
      { step: "D4", price: 400 },
      { step: "D5", price: 403 },
      { step: "D6", price: 401 },
      { step: "D7", price: 402 },
    ],
    prompt: "What is the most disciplined move for long-term investors?",
    options: [
      "Trade every small move to force action.",
      "Panic sell until trend certainty returns.",
      "Follow the plan and avoid over-trading noise.",
      "Switch entire strategy every day.",
    ],
    correctIndex: 2,
    explanation:
      "When the market chops sideways, consistency and reduced over-trading preserve edge.",
    xpReward: 20,
    coinsReward: 12,
  },
  {
    id: "cp-higher-lows",
    title: "Higher Lows Setup",
    ticker: "NVDA",
    context: "Stock pulls back repeatedly but each low is higher than the last.",
    series: [
      { step: "D1", price: 905 },
      { step: "D2", price: 892 },
      { step: "D3", price: 918 },
      { step: "D4", price: 907 },
      { step: "D5", price: 934 },
      { step: "D6", price: 926 },
      { step: "D7", price: 947 },
    ],
    prompt: "Which interpretation best fits this chart?",
    options: [
      "Demand appears to be stepping in on pullbacks.",
      "The trend has clearly reversed downward.",
      "The stock is guaranteed to gap down tomorrow.",
      "This is a pure mean-reversion collapse.",
    ],
    correctIndex: 0,
    explanation:
      "Higher lows indicate buyers are willing to enter at increasingly higher prices.",
    xpReward: 24,
    coinsReward: 14,
  },
  {
    id: "cp-overextension",
    title: "Parabolic Move",
    ticker: "TSLA",
    context: "Price rises rapidly in a short span without consolidation.",
    series: [
      { step: "D1", price: 190 },
      { step: "D2", price: 198 },
      { step: "D3", price: 208 },
      { step: "D4", price: 223 },
      { step: "D5", price: 241 },
      { step: "D6", price: 256 },
      { step: "D7", price: 268 },
    ],
    prompt: "What risk should you monitor most closely?",
    options: [
      "False breakout and sharp pullback risk.",
      "No volatility risk at all.",
      "Cash allocation always underperforms here.",
      "Dividend cuts in index ETFs.",
    ],
    correctIndex: 0,
    explanation:
      "Parabolic price moves can reverse quickly if momentum fades or sentiment shifts.",
    xpReward: 23,
    coinsReward: 13,
  },
];
