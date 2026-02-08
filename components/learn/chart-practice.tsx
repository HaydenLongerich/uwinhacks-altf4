"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartPracticeDeck } from "@/lib/data/chart-practice";
import { applyProfileProgress } from "@/lib/supabase/progress";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MIN_CORRECT_XP = 10;
const MAX_CORRECT_XP = 30;

function rollCorrectXp() {
  return (
    Math.floor(Math.random() * (MAX_CORRECT_XP - MIN_CORRECT_XP + 1)) +
    MIN_CORRECT_XP
  );
}

export function ChartPractice({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);

  const drill = chartPracticeDeck[index];
  const progress = ((index + (selected !== null ? 1 : 0)) / chartPracticeDeck.length) * 100;

  const feedback = useMemo(() => {
    if (selected === null) {
      return null;
    }
    if (isCorrect) {
      return `Correct. ${drill.explanation}`;
    }
    return `Not quite. ${drill.explanation}`;
  }, [drill.explanation, isCorrect, selected]);

  const submitAnswer = async (answerIndex: number) => {
    if (selected !== null) {
      return;
    }

    const correct = answerIndex === drill.correctIndex;
    setSelected(answerIndex);
    setIsCorrect(correct);
    setStatus(null);

    if (!correct) {
      return;
    }

    setIsSaving(true);
    try {
      let note: string | null = null;
      const drillXp = rollCorrectXp();
      const drillCoins = Math.max(5, Math.floor(drillXp * 0.6));

      const { error: drillProgressError } = await supabase.from("chart_practice_progress").upsert(
        {
          user_id: userId,
          drill_id: drill.id,
          completed: true,
          score: 100,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,drill_id",
        },
      );

      if (drillProgressError) {
        note = "Chart-practice table is not ready yet. Rewards still apply.";
      }

      const progressResult = await applyProfileProgress({
        supabase,
        userId,
        xpDelta: drillXp,
        coinsDelta: drillCoins,
        streakDelta: 1,
      });

      if (progressResult.ok) {
        setXpEarned((value) => value + drillXp);
        setCoinsEarned((value) => value + drillCoins);
        setStatus(note);
        router.refresh();
      } else {
        setStatus(
          progressResult.storageReady
            ? `Could not update profile rewards right now. ${progressResult.error ?? ""}`.trim()
            : "Supabase schema is incomplete, so rewards could not be persisted.",
        );
      }
    } catch (unknownError) {
      setStatus(
        unknownError instanceof Error
          ? unknownError.message
          : "Could not save chart-practice rewards right now.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const nextDrill = () => {
    setIndex((current) => (current + 1) % chartPracticeDeck.length);
    setSelected(null);
    setIsCorrect(null);
    setStatus(null);
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader>
        <CardTitle>Chart Practice Lab</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {drill.ticker} | {drill.title}
          </p>
          <p className="text-sm text-slate-700">{drill.context}</p>
        </div>

        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-cyan-500 transition-all"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>

        <div className="h-64 rounded-xl border border-slate-200 bg-slate-50 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={drill.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="step" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          <p className="font-medium">{drill.prompt}</p>
          {drill.options.map((option, optionIndex) => {
            const active = selected === optionIndex;
            return (
              <Button
                key={option}
                type="button"
                variant="outline"
                onClick={() => submitAnswer(optionIndex)}
                disabled={selected !== null}
                className={`w-full justify-start border-slate-200 bg-slate-50 text-left text-slate-900 hover:bg-slate-100 ${
                  active ? "border-cyan-300 bg-cyan-50" : ""
                }`}
              >
                {option}
              </Button>
            );
          })}
        </div>

        {feedback ? (
          <p className={`text-sm ${isCorrect ? "text-emerald-600" : "text-amber-600"}`}>
            {feedback}
          </p>
        ) : null}

        <div className="flex items-center justify-between text-xs text-slate-600">
          <p>
            XP earned: {xpEarned} | Coins earned: {coinsEarned}
          </p>
          <Button
            type="button"
            onClick={nextDrill}
            disabled={selected === null}
            className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          >
            {index === chartPracticeDeck.length - 1 ? "Restart Drill Deck" : "Next Chart"}
          </Button>
        </div>
        {isSaving ? <p className="text-xs text-slate-500">Saving rewards...</p> : null}
        {status ? <p className="text-xs text-slate-500">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
