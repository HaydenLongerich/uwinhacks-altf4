import { createSeededRng, pickWeighted, randomBetween } from "@/lib/engines/random";
import type { MarketRegime, MarketYear } from "@/lib/types/platform";

const headlines: Record<MarketRegime, string[]> = {
  normal: [
    "Steady GDP growth keeps markets calm",
    "Inflation cools while earnings beat expectations",
    "Broad market grinds higher on strong guidance",
  ],
  boom: [
    "AI mania sends growth equities vertical",
    "Risk assets rally as rates fall sharply",
    "Mega-cap melt-up pushes indices to records",
  ],
  crash: [
    "Credit shock triggers broad panic selling",
    "Liquidity crunch sparks historic drawdown",
    "Sudden de-risking wipes out recent gains",
  ],
  recession: [
    "Corporate layoffs rise as demand contracts",
    "Manufacturing slowdown drags global outlook",
    "Consumers pull back amid tighter credit",
  ],
};

function pickRegime(
  rng: () => number,
  previous: MarketRegime | null,
): MarketRegime {
  const base = [
    { weight: 0.52, value: "normal" as const },
    { weight: 0.2, value: "boom" as const },
    { weight: 0.15, value: "recession" as const },
    { weight: 0.13, value: "crash" as const },
  ];

  if (previous === "crash") {
    return pickWeighted(rng, [
      { weight: 0.48, value: "recession" as const },
      { weight: 0.37, value: "normal" as const },
      { weight: 0.15, value: "boom" as const },
    ]);
  }

  if (previous === "boom") {
    return pickWeighted(rng, [
      { weight: 0.45, value: "normal" as const },
      { weight: 0.28, value: "boom" as const },
      { weight: 0.17, value: "recession" as const },
      { weight: 0.1, value: "crash" as const },
    ]);
  }

  return pickWeighted(rng, base);
}

function regimeReturn(rng: () => number, regime: MarketRegime) {
  switch (regime) {
    case "boom":
      return randomBetween(rng, 0.14, 0.32);
    case "crash":
      return randomBetween(rng, -0.45, -0.18);
    case "recession":
      return randomBetween(rng, -0.12, 0.05);
    default:
      return randomBetween(rng, 0.03, 0.12);
  }
}

function regimeVolatility(rng: () => number, regime: MarketRegime) {
  switch (regime) {
    case "boom":
      return randomBetween(rng, 0.16, 0.3);
    case "crash":
      return randomBetween(rng, 0.28, 0.5);
    case "recession":
      return randomBetween(rng, 0.2, 0.36);
    default:
      return randomBetween(rng, 0.1, 0.2);
  }
}

export function generateMarketTimeline(seed: string, years: number): MarketYear[] {
  const rng = createSeededRng(seed);
  const timeline: MarketYear[] = [];
  let previousRegime: MarketRegime | null = null;

  for (let index = 0; index < years; index += 1) {
    const regime = pickRegime(rng, previousRegime);
    const possibleHeadlines = headlines[regime];
    const headline =
      possibleHeadlines[Math.floor(rng() * possibleHeadlines.length)];
    const returnPct = regimeReturn(rng, regime);
    const volatility = regimeVolatility(rng, regime);

    timeline.push({
      year: index + 1,
      regime,
      headline,
      returnPct,
      volatility,
    });

    previousRegime = regime;
  }

  return timeline;
}
