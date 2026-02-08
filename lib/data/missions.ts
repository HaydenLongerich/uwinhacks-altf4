import type { Mission } from "@/lib/types/platform";

export const dailyMissions: Mission[] = [
  {
    id: "daily-learn",
    title: "30s Lesson",
    description: "Complete one micro-lesson in Learn.",
    xp: 25,
    coins: 15,
    cadence: "daily",
  },
  {
    id: "daily-rebalance",
    title: "Balance Keeper",
    description: "Run one simulation year and choose Rebalance.",
    xp: 20,
    coins: 12,
    cadence: "daily",
  },
  {
    id: "daily-log",
    title: "Market Check-in",
    description: "Open dashboard and review your allocation chart.",
    xp: 10,
    coins: 8,
    cadence: "daily",
  },
];

export const weeklyMissions: Mission[] = [
  {
    id: "weekly-no-panic",
    title: "No Panic Week",
    description: "Complete a full sim run with zero crash-year sells.",
    xp: 80,
    coins: 50,
    cadence: "weekly",
  },
  {
    id: "weekly-multiverse",
    title: "Multiverse Analyst",
    description: "Compare 3 timelines side-by-side in Results.",
    xp: 60,
    coins: 35,
    cadence: "weekly",
  },
];
