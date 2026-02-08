"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { lessonDeck } from "@/lib/data/lessons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { applyProfileProgress } from "@/lib/supabase/progress";

const MIN_CORRECT_XP = 10;
const MAX_CORRECT_XP = 30;

function rollCorrectXp() {
  return (
    Math.floor(Math.random() * (MAX_CORRECT_XP - MIN_CORRECT_XP + 1)) +
    MIN_CORRECT_XP
  );
}

export function LessonArena({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
    setStatus(null);

    if (answerCorrect) {
      const lessonXp = rollCorrectXp();
      const lessonCoins = Math.max(5, Math.floor(lessonXp * 0.6));

      setIsSaving(true);
      try {
        let note: string | null = null;

        const { error: lessonProgressError } = await supabase.from("lesson_progress").upsert(
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

        if (lessonProgressError) {
          note = "Lesson completion table is not ready yet. Rewards still apply.";
        }

        const progressResult = await applyProfileProgress({
          supabase,
          userId,
          xpDelta: lessonXp,
          coinsDelta: lessonCoins,
          streakDelta: 1,
        });

        if (progressResult.ok) {
          setXpEarned((current) => current + lessonXp);
          setCoinsEarned((current) => current + lessonCoins);
          if (note) {
            setStatus(note);
          }
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
            : "Could not save lesson rewards right now.",
        );
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
    setStatus(null);
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
          {status ? <p className="text-xs text-slate-500">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
