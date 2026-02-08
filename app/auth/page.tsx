import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthExperience } from "@/components/auth/auth-experience";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profile";

async function AuthPageContent({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; entry?: string }>;
}) {
  await connection();
  const params = await searchParams;

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

  const initialMode = params.mode === "signup" ? "signup" : "login";
  const entry = params.entry === "landing" ? "landing" : undefined;

  return <AuthExperience initialMode={initialMode} entry={entry} />;
}

export default function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; entry?: string }>;
}) {
  return (
    <Suspense>
      <AuthPageContent searchParams={searchParams} />
    </Suspense>
  );
}
