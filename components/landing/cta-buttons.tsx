"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function CTAButtons({
  onJoin,
  onLogin,
  centered = false,
  className,
}: {
  onJoin: () => void;
  onLogin: () => void;
  centered?: boolean;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const hoverMotion = shouldReduceMotion ? undefined : { y: -2, scale: 1.02 };
  const tapMotion = shouldReduceMotion ? undefined : { scale: 0.98 };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-3",
        centered ? "justify-center" : "justify-start",
        className,
      )}
    >
      <motion.button
        type="button"
        whileHover={hoverMotion}
        whileTap={tapMotion}
        onClick={onJoin}
        className="rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(6,182,212,0.28)] transition hover:bg-cyan-400"
      >
        Join for free
      </motion.button>
      <motion.button
        type="button"
        whileHover={hoverMotion}
        whileTap={tapMotion}
        onClick={onLogin}
        className="rounded-full border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
      >
        Log in
      </motion.button>
    </div>
  );
}
