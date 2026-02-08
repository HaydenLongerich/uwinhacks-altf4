"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRouter } from "next/navigation";
import { CTAButtons } from "@/components/landing/cta-buttons";
import { FeatureCard } from "@/components/landing/feature-card";
import { PageTransitionOverlay } from "@/components/transition/page-transition-overlay";

function HeroIllustration({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      className="relative mx-auto aspect-[5/4] w-full max-w-xl overflow-hidden rounded-[2rem] border border-cyan-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)]"
      animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
      transition={
        reducedMotion
          ? undefined
          : { duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
      }
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,0.25),transparent_50%),radial-gradient(circle_at_88%_12%,rgba(14,165,233,0.22),transparent_45%),linear-gradient(180deg,#f8fdff,#eef8ff)]" />
      <div className="relative z-10 grid h-full place-items-center p-8">
        <div className="w-full max-w-sm rounded-3xl border border-cyan-100 bg-white/95 p-5 shadow-[0_12px_30px_rgba(2,132,199,0.14)]">
          <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
            <span>Market Pulse</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
              +12.4%
            </span>
          </div>
          <svg viewBox="0 0 280 120" className="h-24 w-full">
            <path
              d="M4 88 C42 72, 44 28, 80 34 C102 38, 118 82, 148 76 C172 71, 188 30, 216 42 C236 50, 250 84, 276 66"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
            <div className="rounded-2xl bg-cyan-50 p-2">
              <p className="font-semibold text-cyan-700">XP</p>
              <p>+80</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-2">
              <p className="font-semibold text-sky-700">Streak</p>
              <p>14d</p>
            </div>
            <div className="rounded-2xl bg-indigo-50 p-2">
              <p className="font-semibold text-indigo-700">Coins</p>
              <p>540</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SideIllustration({
  reducedMotion,
  tone,
}: {
  reducedMotion: boolean;
  tone: "teal" | "blue";
}) {
  const gradient =
    tone === "teal"
      ? "from-cyan-100 via-white to-teal-100"
      : "from-sky-100 via-white to-indigo-100";
  const accent = tone === "teal" ? "bg-cyan-500/20" : "bg-indigo-500/20";

  return (
    <motion.div
      className={`relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br ${gradient} shadow-[0_25px_70px_rgba(15,23,42,0.09)]`}
      animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
      transition={
        reducedMotion
          ? undefined
          : { duration: 6.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
      }
    >
      <div className="absolute inset-6 rounded-3xl border border-white/70 bg-white/80 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Behavior Lab
            </p>
            <p className="text-lg font-semibold text-slate-800">Discipline score</p>
          </div>
          <div className="rounded-2xl bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
            82
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-full w-[82%] rounded-full bg-cyan-500" />
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-full w-[64%] rounded-full bg-sky-500" />
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-full w-[71%] rounded-full bg-indigo-500" />
          </div>
        </div>
      </div>
      <div className={`absolute -bottom-10 -right-8 h-40 w-40 rounded-full blur-2xl ${accent}`} />
    </motion.div>
  );
}

export function LandingSections({ entry }: { entry?: "auth" }) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const scrollRef = useRef<HTMLElement | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayMode, setOverlayMode] = useState<"in" | "out">("out");
  const { scrollYProgress } = useScroll({
    container: scrollRef,
  });
  const progressScaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    mass: 0.22,
  });
  const blobOneY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const blobTwoY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const heroCopyY = useTransform(scrollYProgress, [0, 0.3], [0, -70]);
  const heroCopyOpacity = useTransform(scrollYProgress, [0, 0.24], [1, 0.62]);
  const heroVisualY = useTransform(scrollYProgress, [0, 0.3], [0, 70]);
  const heroVisualRotate = useTransform(scrollYProgress, [0, 0.3], [0, 2]);

  useEffect(() => {
    if (entry !== "auth" || shouldReduceMotion) {
      return;
    }

    setOverlayMode("in");
    setShowOverlay(true);

    const timer = window.setTimeout(() => {
      setShowOverlay(false);
    }, 560);

    return () => window.clearTimeout(timer);
  }, [entry, shouldReduceMotion]);

  const goToAuth = (mode: "signup" | "login") => {
    const authHref =
      mode === "signup"
        ? "/auth/sign-up"
        : "/auth/login";
    if (shouldReduceMotion) {
      router.push(authHref);
      return;
    }
    if (isLeaving) {
      return;
    }

    setIsLeaving(true);
    setOverlayMode("out");
    setShowOverlay(true);

    window.setTimeout(() => {
      router.push(authHref);
    }, 520);
  };

  const sectionReveal = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 40, scale: 0.985, filter: "blur(8px)" },
        whileInView: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
        viewport: { once: true, amount: 0.28 },
        transition: { duration: 0.72 },
      };

  return (
    <main
      ref={scrollRef}
      className="landing-scroll relative h-screen snap-y snap-proximity overflow-y-auto bg-[linear-gradient(180deg,#f9fdff_0%,#eef8ff_100%)] text-slate-900"
    >
      <PageTransitionOverlay show={showOverlay} mode={overlayMode} />
      <div className="pointer-events-none sticky top-0 z-40 px-5 pt-4 md:px-8">
        <div className="h-1 w-full rounded-full bg-cyan-100/90">
          <motion.div
            className="h-full origin-left rounded-full bg-cyan-500"
            style={{ scaleX: progressScaleX }}
          />
        </div>
      </div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-24 z-0 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl"
        style={{ y: shouldReduceMotion ? 0 : blobOneY }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-0 top-[32rem] z-0 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl"
        style={{ y: shouldReduceMotion ? 0 : blobTwoY }}
      />

      <motion.div
        animate={
          isLeaving && !shouldReduceMotion
            ? { opacity: 0, scale: 0.985, filter: "blur(8px)" }
            : { opacity: 1, scale: 1, filter: "blur(0px)" }
        }
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <section className="snap-start px-6 py-14 md:px-10 md:py-16">
          <motion.div
            {...sectionReveal}
            className="relative z-10 mx-auto grid min-h-[88vh] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.05fr]"
          >
            <motion.div
              className="space-y-6"
              style={
                shouldReduceMotion
                  ? undefined
                  : { y: heroCopyY, opacity: heroCopyOpacity }
              }
            >
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">
                Alt F4 Invest
              </p>
              <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
                Alt F4 Invest
              </h1>
              <p className="max-w-lg text-lg text-slate-600">
                Learn investing. Simulate markets. Build discipline.
              </p>
              <CTAButtons
                onJoin={() => goToAuth("signup")}
                onLogin={() => goToAuth("login")}
              />
            </motion.div>
            <motion.div
              style={
                shouldReduceMotion
                  ? undefined
                  : { y: heroVisualY, rotate: heroVisualRotate }
              }
            >
              <HeroIllustration reducedMotion={shouldReduceMotion} />
            </motion.div>
          </motion.div>
        </section>

        <section className="snap-start px-6 py-14 md:px-10">
          <motion.div
            {...sectionReveal}
            className="mx-auto grid min-h-[80vh] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_1fr]"
          >
            <SideIllustration reducedMotion={shouldReduceMotion} tone="teal" />
            <div className="space-y-5">
              <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
                simple. smooth. smarter investing.
              </h2>
              <p className="max-w-xl text-lg text-slate-600">
                Alt F4 Invest combines bite-sized finance lessons, realistic market
                simulations, and behavior rewards so you build practical decision
                skills, not just theory.
              </p>
            </div>
          </motion.div>
        </section>

        <section className="snap-start px-6 py-14 md:px-10">
          <motion.div
            {...sectionReveal}
            className="mx-auto grid min-h-[80vh] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.05fr]"
          >
            <div className="space-y-5">
              <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
                built on behavior & discipline
              </h2>
              <p className="max-w-xl text-lg text-slate-600">
                Missions, streaks, and emotion tracking turn consistency into
                momentum. You learn to manage panic, control risk, and make stronger
                long-term decisions.
              </p>
            </div>
            <SideIllustration reducedMotion={shouldReduceMotion} tone="blue" />
          </motion.div>
        </section>

        <section className="snap-start px-6 py-14 md:px-10">
          <motion.div
            {...sectionReveal}
            className="mx-auto min-h-[78vh] w-full max-w-6xl"
          >
            <div className="mb-10 max-w-2xl space-y-4">
              <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
                learn & simulate anytime
              </h2>
              <p className="text-lg text-slate-600">
                Built for fast sessions and deep practice across mobile and desktop.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <motion.div
                initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5 }}
              >
                <FeatureCard
                  icon={<span className="text-xl">30s</span>}
                  title="30-second lessons"
                  description="Quick concept drills with instant feedback and XP rewards."
                />
              </motion.div>
              <motion.div
                initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: 0.07 }}
              >
                <FeatureCard
                  icon={<span className="text-xl">Y/Y</span>}
                  title="Year-by-year simulation"
                  description="Make one decision per market year and see compounding outcomes."
                />
              </motion.div>
              <motion.div
                initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: 0.14 }}
              >
                <FeatureCard
                  icon={<span className="text-xl">D&D</span>}
                  title="Drag & drop portfolio builder"
                  description="Balance assets visually and tune risk, growth, and stability."
                />
              </motion.div>
            </div>
          </motion.div>
        </section>

        <section className="snap-start px-6 py-16 md:px-10 md:py-20">
          <motion.div
            {...sectionReveal}
            className="mx-auto grid min-h-[70vh] w-full max-w-5xl place-items-center rounded-[2.2rem] border border-cyan-100 bg-white/80 p-8 text-center shadow-[0_28px_70px_rgba(15,23,42,0.09)] md:p-12"
          >
            <div className="space-y-6">
              <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
                Start your first simulation
              </h2>
              <p className="text-lg text-slate-600">
                Train your decision-making with realistic market timelines.
              </p>
              <CTAButtons
                centered
                onJoin={() => goToAuth("signup")}
                onLogin={() => goToAuth("login")}
              />
              <p className="text-sm text-slate-500">
                No credit card. Save progress to your profile.
              </p>
            </div>
          </motion.div>
        </section>
      </motion.div>
    </main>
  );
}
