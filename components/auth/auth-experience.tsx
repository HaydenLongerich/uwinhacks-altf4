"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AuthGateway } from "@/components/auth/auth-gateway";
import { PageTransitionOverlay } from "@/components/transition/page-transition-overlay";

type AuthMode = "login" | "signup";

export function AuthExperience({
  initialMode,
  entry,
}: {
  initialMode: AuthMode;
  entry?: "landing";
}) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [isLeaving, setIsLeaving] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayMode, setOverlayMode] = useState<"in" | "out">("out");

  useEffect(() => {
    if (entry !== "landing" || shouldReduceMotion) {
      return;
    }

    setOverlayMode("in");
    setShowOverlay(true);

    const timer = window.setTimeout(() => {
      setShowOverlay(false);
    }, 560);

    return () => window.clearTimeout(timer);
  }, [entry, shouldReduceMotion]);

  const backToLanding = () => {
    if (shouldReduceMotion) {
      router.push("/");
      return;
    }
    if (isLeaving) {
      return;
    }

    setIsLeaving(true);
    setOverlayMode("out");
    setShowOverlay(true);

    window.setTimeout(() => {
      router.push("/?entry=auth");
    }, 520);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_15%,#d9f4ff_0%,transparent_35%),radial-gradient(circle_at_80%_12%,#dbeafe_0%,transparent_32%),linear-gradient(180deg,#f8fdff_0%,#ecf7ff_100%)] p-6 md:p-10">
      <PageTransitionOverlay show={showOverlay} mode={overlayMode} />

      <div className="mx-auto flex min-h-[90vh] w-full max-w-5xl items-center justify-center">
        <motion.div
          initial={
            shouldReduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.985 }
          }
          animate={
            isLeaving && !shouldReduceMotion
              ? { opacity: 0, y: 10, scale: 0.985, filter: "blur(6px)" }
              : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          }
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <button
            type="button"
            onClick={backToLanding}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-400 hover:bg-white"
          >
            Back
          </button>

          <section className="rounded-3xl border border-cyan-100 bg-white/95 p-6 shadow-[0_30px_70px_rgba(15,23,42,0.12)] md:p-7">
            <div className="mb-5 space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">
                Alt F4 Invest
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Join or log in
              </h1>
              <p className="text-sm text-slate-600">
                Continue with Google or your email to save progress and unlock the
                full simulator.
              </p>
            </div>
            <AuthGateway initialMode={initialMode} />
          </section>
        </motion.div>
      </div>
    </main>
  );
}
