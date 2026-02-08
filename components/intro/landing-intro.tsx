"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export function LandingIntro() {
  const router = useRouter();

  const goToAuth = () => {
    router.push("/auth");
  };

  return (
    <button
      type="button"
      aria-label="Enter Alt F4 Invest"
      onClick={goToAuth}
      className="relative flex min-h-screen w-full cursor-pointer items-center justify-center overflow-hidden bg-[linear-gradient(140deg,#061224_5%,#0e2344_48%,#1d3f6f_100%)] text-slate-50"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="text-xs uppercase tracking-[0.35em] text-cyan-200/80"
        >
          Investment Simulator
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-3 text-5xl font-semibold tracking-tight md:text-7xl"
        >
          Alt F4 Invest
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.45 }}
          className="mt-6 text-sm text-slate-200/90 md:text-base"
        >
          Click anywhere to enter
        </motion.p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 1.1 }}
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-0 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-indigo-200/15 blur-3xl" />
      </motion.div>
    </button>
  );
}
