import { redirect } from "next/navigation";
import { AvatarEditor } from "@/components/avatar/avatar-editor";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

export default async function AvatarSetupPage() {
  const { user, profile, storageReady } = await requireUserProfile({
    allowIncompleteAvatar: true,
  });

  if (profile.avatarCompleted) {
    redirect("/dashboard");
  }

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Avatar Setup</h1>
          <p className="text-sm text-slate-300">
            Customize your in-game identity to unlock the full platform.
          </p>
        </div>
        <AvatarEditor
          userId={user.id}
          level={profile.level}
          initialConfig={profile.avatarConfig}
          storageReady={storageReady}
        />
      </section>
    </AppShell>
  );
}
