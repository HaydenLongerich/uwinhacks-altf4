"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChartPractice } from "@/components/learn/chart-practice";
import { LessonArena } from "@/components/learn/lesson-arena";

type LearnMode = "lessons" | "practice";

export function LearningHub({ userId }: { userId: string }) {
  const [mode, setMode] = useState<LearnMode>("lessons");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        <Button
          type="button"
          variant={mode === "lessons" ? "default" : "ghost"}
          onClick={() => setMode("lessons")}
          className={
            mode === "lessons"
              ? "rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              : "rounded-full text-slate-700 hover:bg-slate-100"
          }
        >
          Learn
        </Button>
        <Button
          type="button"
          variant={mode === "practice" ? "default" : "ghost"}
          onClick={() => setMode("practice")}
          className={
            mode === "practice"
              ? "rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              : "rounded-full text-slate-700 hover:bg-slate-100"
          }
        >
          Practice Charts
        </Button>
      </div>

      {mode === "lessons" ? <LessonArena userId={userId} /> : null}
      {mode === "practice" ? <ChartPractice userId={userId} /> : null}
    </div>
  );
}
