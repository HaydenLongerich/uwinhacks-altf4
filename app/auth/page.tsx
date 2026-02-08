import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthGateway } from "@/components/auth/auth-gateway";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profile";

async function AuthPageContent() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { profile } = await ensureProfile(supabase, user);
    if (!profile.avatarCompleted) {
      redirect("/avatar/setup");
    }
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#1f3a67_0%,#0d1627_58%)] p-6 md:p-10">
      <div className="mx-auto flex min-h-[85vh] w-full max-w-5xl flex-col justify-center gap-8 lg:grid lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-7 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
            Alt F4 Invest
          </p>
          <h1 className="text-4xl font-semibold md:text-5xl">
            Learn faster. Simulate deeper. Invest better.
          </h1>
          <p className="max-w-md text-sm text-slate-300">
            Wealthsimple-inspired clarity with Duolingo-level gamification and
            over-engineered simulation systems.
          </p>
        </section>
        <AuthGateway />
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  );
}
