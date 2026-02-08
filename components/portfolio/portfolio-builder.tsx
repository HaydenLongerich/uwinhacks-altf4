"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyProfileProgress } from "@/lib/supabase/progress";
import { activityRewards } from "@/lib/data/activity-rewards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AssetType } from "@/lib/types/platform";

interface AssetCard {
  id: string;
  type: AssetType;
  name: string;
  allocation: number;
  riskWeight: number;
  growthWeight: number;
  stabilityWeight: number;
}

const STARTING_ASSETS: AssetCard[] = [
  {
    id: "asset-etf",
    type: "etf",
    name: "ETF Basket",
    allocation: 40,
    riskWeight: 45,
    growthWeight: 65,
    stabilityWeight: 70,
  },
  {
    id: "asset-stocks",
    type: "stocks",
    name: "Stocks",
    allocation: 45,
    riskWeight: 82,
    growthWeight: 85,
    stabilityWeight: 32,
  },
  {
    id: "asset-cash",
    type: "cash",
    name: "Cash",
    allocation: 15,
    riskWeight: 8,
    growthWeight: 10,
    stabilityWeight: 92,
  },
];

function normalize(assets: AssetCard[]) {
  const total = assets.reduce((sum, asset) => sum + asset.allocation, 0);
  if (total <= 0) {
    return assets;
  }
  return assets.map((asset, index) => {
    if (index === assets.length - 1) {
      const allocated = assets
        .slice(0, assets.length - 1)
        .reduce((sum, item) => sum + Math.round((item.allocation / total) * 100), 0);
      return {
        ...asset,
        allocation: Math.max(0, 100 - allocated),
      };
    }
    return {
      ...asset,
      allocation: Math.round((asset.allocation / total) * 100),
    };
  });
}

function reorder<T>(items: T[], from: number, to: number) {
  const clone = [...items];
  const [moved] = clone.splice(from, 1);
  clone.splice(to, 0, moved);
  return clone;
}

export function PortfolioBuilder({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [assets, setAssets] = useState<AssetCard[]>(STARTING_ASSETS);
  const [templateName, setTemplateName] = useState("Core Growth");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation, 0);

  const meters = useMemo(() => {
    const total = Math.max(1, totalAllocation);
    const score = (key: "riskWeight" | "growthWeight" | "stabilityWeight") =>
      assets.reduce((sum, asset) => sum + (asset[key] * asset.allocation) / total, 0);
    return {
      risk: Math.round(score("riskWeight")),
      growth: Math.round(score("growthWeight")),
      stability: Math.round(score("stabilityWeight")),
    };
  }, [assets, totalAllocation]);

  const updateAllocation = (id: string, allocation: number) => {
    setAssets((current) =>
      current.map((asset) =>
        asset.id === id
          ? { ...asset, allocation: Math.max(0, Math.min(100, allocation)) }
          : asset,
      ),
    );
  };

  const onDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      return;
    }
    setAssets((current) => {
      const from = current.findIndex((asset) => asset.id === draggingId);
      const to = current.findIndex((asset) => asset.id === targetId);
      if (from === -1 || to === -1) {
        return current;
      }
      return reorder(current, from, to);
    });
    setDraggingId(null);
  };

  const saveTemplate = async () => {
    const { xp: rewardXp, coins: rewardCoins } = activityRewards.portfolioTemplate;
    const normalized = normalize(assets);
    setAssets(normalized);
    setStatus(null);

    const payload = {
      user_id: userId,
      name: templateName,
      allocation_json: normalized.map((asset) => ({
        type: asset.type,
        allocation: asset.allocation,
      })),
      risk_score: meters.risk,
      growth_score: meters.growth,
      stability_score: meters.stability,
      is_template: true,
    };

    localStorage.setItem(
      `altf4-portfolio:${templateName}`,
      JSON.stringify({ ...payload, savedAt: new Date().toISOString() }),
    );

    let templateStatus = "Template saved locally. Database tables may not be initialized yet.";
    try {
      await supabase.from("portfolios").insert(payload);
      templateStatus = "Template saved to database and local storage.";
    } catch {
      // Keep local-save status fallback; reward update still runs.
    }

    const progressResult = await applyProfileProgress({
      supabase,
      userId,
      xpDelta: rewardXp,
      coinsDelta: rewardCoins,
    });

    if (progressResult.ok) {
      setStatus(`${templateStatus} +${rewardXp} XP, +${rewardCoins} coins.`);
      router.refresh();
    } else {
      setStatus(
        `${templateStatus} Rewards failed: ${progressResult.error ?? "profile update error"}`,
      );
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <Card className="border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Drag & Drop Portfolio Builder</CardTitle>
          <Button
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
            onClick={() => setAssets((current) => normalize(current))}
          >
            Normalize to 100%
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              draggable
              onDragStart={() => setDraggingId(asset.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(asset.id)}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{asset.name}</p>
                <span className="text-xs uppercase text-slate-600">{asset.type}</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Allocation</span>
                  <span>{asset.allocation}%</span>
                </div>
                <Input
                  type="range"
                  min={0}
                  max={100}
                  value={asset.allocation}
                  className="border-slate-200 bg-slate-50"
                  onChange={(event) =>
                    updateAllocation(asset.id, Number(event.target.value))
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Live Meters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Total allocation</p>
            <p className={`text-sm ${totalAllocation === 100 ? "text-emerald-600" : "text-amber-600"}`}>
              {totalAllocation}%
            </p>
          </div>
          <div className="space-y-2">
            {[
              { label: "Risk", value: meters.risk },
              { label: "Growth", value: meters.growth },
              { label: "Stability", value: meters.stability },
            ].map((meter) => (
              <div key={meter.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{meter.label}</span>
                  <span>{meter.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-cyan-500"
                    style={{ width: `${meter.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <label className="space-y-1 text-xs text-slate-600">
            Template name
            <Input
              value={templateName}
              className="border-slate-200 bg-slate-50"
              onChange={(event) => setTemplateName(event.target.value)}
            />
          </label>

          <Button
            className="w-full bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
            onClick={saveTemplate}
          >
            Save Template
          </Button>
          {status ? <p className="text-xs text-slate-600">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
