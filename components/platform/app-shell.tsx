import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import type { PlatformProfile } from "@/lib/types/platform";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/learn", label: "Learn" },
  { href: "/simulate", label: "Simulate" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/strategies", label: "Strategies" },
  { href: "/reports", label: "Reports" },
  { href: "/profile", label: "Profile" },
];

function levelProgress(profile: PlatformProfile) {
  const previousThreshold = Math.pow(Math.max(1, profile.level - 1), 2) * 100;
  const nextThreshold = Math.pow(profile.level, 2) * 100;
  const numerator = profile.xp - previousThreshold;
  const denominator = nextThreshold - previousThreshold;
  if (denominator <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, numerator / denominator));
}

export function AppShell({
  profile,
  userEmail,
  children,
}: {
  profile: PlatformProfile;
  userEmail: string;
  children: React.ReactNode;
}) {
  const progress = levelProgress(profile);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#111f3d_0%,#060910_55%)] text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/dashboard" className="text-xl font-semibold tracking-tight">
              Alt F4 Invest
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Level {profile.level}</Badge>
              <Badge variant="outline">{profile.coins} coins</Badge>
              <span className="text-sm text-slate-300">{userEmail}</span>
              <LogoutButton />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>XP {profile.xp}</span>
              <span>Streak {profile.streak} days</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-500/10"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
