export type MarketStockCategory =
  | "Large Cap Tech"
  | "Semiconductors"
  | "Healthcare"
  | "Energy"
  | "Speculative";

export interface MarketSimStock {
  symbol: string;
  name: string;
  category: MarketStockCategory;
  startPrice: number;
  dailyDrift: number;
  volatility: number;
}

export type MarketChartRangeKey = "1W" | "1M" | "6M" | "1Y";

export const marketChartRangeDays: Record<MarketChartRangeKey, number> = {
  "1W": 7,
  "1M": 30,
  "6M": 180,
  "1Y": 365,
};

export const marketSimStocks: MarketSimStock[] = [
  {
    symbol: "AAPL",
    name: "Apple",
    category: "Large Cap Tech",
    startPrice: 194,
    dailyDrift: 0.0005,
    volatility: 0.015,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    category: "Semiconductors",
    startPrice: 895,
    dailyDrift: 0.00085,
    volatility: 0.023,
  },
  {
    symbol: "JNJ",
    name: "Johnson & Johnson",
    category: "Healthcare",
    startPrice: 159,
    dailyDrift: 0.00035,
    volatility: 0.011,
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil",
    category: "Energy",
    startPrice: 108,
    dailyDrift: 0.0004,
    volatility: 0.017,
  },
  {
    symbol: "QNTM",
    name: "Quantum Dynamics",
    category: "Speculative",
    startPrice: 42,
    dailyDrift: 0.0012,
    volatility: 0.04,
  },
];

export const marketSimHistoryDays = 730;
export const marketSimPlayableDays = 365;
export const marketSimStartDay = marketSimHistoryDays - marketSimPlayableDays;

function roundPrice(value: number) {
  return Number(value.toFixed(2));
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(value + 0x6d2b79f5, 1);
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMarketPulse(days: number) {
  const rng = createSeededRng(20260208);
  const pulse: number[] = [];
  let momentum = 0;

  for (let day = 0; day < days; day += 1) {
    const shock = (rng() - 0.5) * 0.006;
    momentum = momentum * 0.88 + shock;
    const macroWave = Math.sin(day / 24) * 0.0015;
    pulse.push(momentum + macroWave);
  }

  return pulse;
}

function buildStockSeries(stock: MarketSimStock, marketPulse: number[]) {
  const rng = createSeededRng(hashString(stock.symbol));
  const prices: number[] = [];
  let price = stock.startPrice;

  prices.push(roundPrice(price));

  for (let day = 1; day < marketSimHistoryDays; day += 1) {
    const randomMove = (rng() - 0.5) * 2 * stock.volatility;
    const jumpRisk = rng() > 0.985 ? (rng() - 0.5) * stock.volatility * 7 : 0;
    const move = stock.dailyDrift + marketPulse[day] + randomMove + jumpRisk;
    price = Math.max(2, price * (1 + move));
    prices.push(roundPrice(price));
  }

  return prices;
}

const marketPulseSeries = buildMarketPulse(marketSimHistoryDays);

export const marketStockSeriesBySymbol: Record<string, number[]> =
  marketSimStocks.reduce<Record<string, number[]>>((accumulator, stock) => {
    accumulator[stock.symbol] = buildStockSeries(stock, marketPulseSeries);
    return accumulator;
  }, {});
