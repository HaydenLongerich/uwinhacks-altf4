import { ResultsView } from "@/components/results/results-view";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const { resultId } = await params;
  const { user, profile } = await requireUserProfile();

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Simulation Results</h1>
          <p className="text-sm text-slate-300">
            Analyze performance, decisions, and behavioral signals.
          </p>
        </div>
        <ResultsView resultId={resultId} />
      </section>
    </AppShell>
  );
}
