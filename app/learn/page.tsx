import { LearningHub } from "@/components/learn/learning-hub";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

export default async function LearnPage() {
  const { user, profile } = await requireUserProfile();

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Learning Arena</h1>
          <p className="text-sm text-slate-600">
            Learn with quick quizzes, then practice decisions on real-style stock charts.
          </p>
        </div>
        <LearningHub userId={user.id} />
      </section>
    </AppShell>
  );
}
