import { ReportsCenter } from "@/components/reports/reports-center";
import { AppShell } from "@/components/platform/app-shell";
import { requireUserProfile } from "@/lib/supabase/require-user-profile";

interface ReportItem {
  id: string;
  weekStart: string;
  status: string;
  summary: string;
  url?: string | null;
}

export default async function ReportsPage() {
  const { user, profile, supabase } = await requireUserProfile();
  let initialReports: ReportItem[] = [];

  const { data, error } = await supabase
    .from("reports")
    .select("id, week_start, status, summary, url")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false })
    .limit(12);

  if (!error && data) {
    initialReports = (data as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? `${Date.now()}`),
      weekStart:
        typeof row.week_start === "string"
          ? row.week_start
          : new Date().toISOString(),
      status: typeof row.status === "string" ? row.status : "queued",
      summary:
        typeof row.summary === "string"
          ? row.summary
          : "Weekly report pending generation.",
      url: typeof row.url === "string" ? row.url : null,
    }));
  }

  return (
    <AppShell profile={profile} userEmail={user.email ?? "unknown"}>
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Reports Center</h1>
          <p className="text-sm text-slate-300">
            Queue and download your weekly investing summaries.
          </p>
        </div>
        <ReportsCenter initialReports={initialReports} />
      </section>
    </AppShell>
  );
}
