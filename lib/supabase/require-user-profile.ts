import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export async function requireUserProfile(
  options: { allowIncompleteAvatar?: boolean } = {},
) {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { profile, storageReady } = await ensureProfile(supabase, user);

  if (!options.allowIncompleteAvatar && !profile.avatarCompleted) {
    redirect("/avatar/setup");
  }

  return { supabase, user, profile, storageReady };
}
