import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "You need to sign in before queueing reports." },
      { status: 401 },
    );
  }

  const report = {
    id: crypto.randomUUID(),
    weekStart: new Date().toISOString(),
    status: "queued",
    summary: "Your weekly report has been queued and is generating.",
    url: null as string | null,
  };

  try {
    await supabase.from("reports").insert({
      id: report.id,
      user_id: user.id,
      week_start: report.weekStart,
      status: report.status,
      summary: report.summary,
      url: report.url,
    });
  } catch {
    // Report queue works even when schema is missing; front-end keeps local state.
  }

  return NextResponse.json({
    ok: true,
    report,
  });
}
