import { LessonArena } from "@/components/learn/lesson-arena";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

export default async function LearnPage() {
  const { user, profile } = await requireUserProfile();

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Lesson Arena</h1>
          <p className="text-sm text-slate-300">
            Complete short drills to earn XP and coins.
          </p>
        </div>
        <LessonArena userId={user.id} />
      </section>
    </AppShell>
  );
}
