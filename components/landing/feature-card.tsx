"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <motion.article
      whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-3xl border border-cyan-100 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
    >
      <div className="mb-4 inline-flex rounded-2xl bg-cyan-50 p-3 text-cyan-700">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </motion.article>
  );
}
