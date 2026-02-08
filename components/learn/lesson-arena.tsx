"use client";

import { useMemo, useState } from "react";
import { lessonDeck } from "@/lib/data/lessons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LessonArena({ userId }: { userId: string }) {
  const supabase = createClient();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const lesson = lessonDeck[index];
  const progress = ((index + (selected !== null ? 1 : 0)) / lessonDeck.length) * 100;

  const canAdvance = selected !== null;

  const feedback = useMemo(() => {
    if (selected === null) {
      return null;
    }
    return isCorrect
      ? "Correct. You gained XP."
      : `Not quite. ${lesson.question.explanation}`;
  }, [isCorrect, lesson.question.explanation, selected]);

  const submitAnswer = async (answerIndex: number) => {
    if (selected !== null) {
      return;
    }
    const answerCorrect = answerIndex === lesson.question.correctIndex;
    setSelected(answerIndex);
    setIsCorrect(answerCorrect);

    if (answerCorrect) {
      const lessonXp = lesson.xpReward;
      const lessonCoins = Math.max(5, Math.floor(lesson.xpReward * 0.6));
      setXpEarned((current) => current + lessonXp);
      setCoinsEarned((current) => current + lessonCoins);

      setIsSaving(true);
      try {
        await supabase.from("lesson_progress").upsert(
          {
            user_id: userId,
            lesson_id: lesson.id,
            completed: true,
            score: 100,
            completed_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,lesson_id",
          },
        );
      } catch {
        // Progress persistence is optional during local development.
      } finally {
        setIsSaving(false);
      }
    }
  };

  const nextLesson = () => {
    if (index >= lessonDeck.length - 1) {
      setIndex(0);
    } else {
      setIndex((current) => current + 1);
    }
    setSelected(null);
    setIsCorrect(null);
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>30-Second Learning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              {lesson.topic}
            </p>
            <p className="text-sm text-slate-700">{lesson.concept}</p>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>

          <div className="space-y-2">
            <p className="font-medium">{lesson.question.prompt}</p>
            {lesson.question.options.map((option, optionIndex) => {
              const active = selected === optionIndex;
              return (
                <Button
                  key={option}
                  type="button"
                  variant="outline"
                  className={`w-full justify-start border-slate-200 bg-slate-50 text-left text-slate-900 hover:bg-slate-100 ${
                    active ? "border-cyan-300/60 bg-cyan-300/10" : ""
                  }`}
                  onClick={() => submitAnswer(optionIndex)}
                  disabled={selected !== null}
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
              onClick={nextLesson}
              disabled={!canAdvance}
              className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
            >
              {index === lessonDeck.length - 1 ? "Restart Deck" : "Next Lesson"}
            </Button>
          </div>
          {isSaving ? <p className="text-xs text-slate-400">Saving progress...</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
