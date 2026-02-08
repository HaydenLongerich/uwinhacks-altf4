"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type TransitionMode = "in" | "out";

export function PageTransitionOverlay({
  show,
  mode,
}: {
  show: boolean;
  mode: TransitionMode;
}) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[120]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            initial={{ opacity: mode === "out" ? 0 : 1 }}
            animate={{ opacity: mode === "out" ? 1 : 0 }}
            transition={{
              duration: shouldReduceMotion ? 0.1 : 0.35,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="absolute inset-0 bg-[linear-gradient(140deg,#071327_0%,#0f2f56_54%,#2dc3df_130%)]"
            style={{ transformOrigin: mode === "out" ? "bottom" : "top" }}
            initial={
              shouldReduceMotion
                ? { opacity: mode === "out" ? 0 : 1 }
                : { scaleY: mode === "out" ? 0 : 1, opacity: 1 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: mode === "out" ? 1 : 0 }
                : { scaleY: mode === "out" ? 1 : 0, opacity: 1 }
            }
            transition={{
              duration: shouldReduceMotion ? 0.12 : 0.55,
              ease: "easeOut",
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
