import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { progressToNextLevel } from "@/lib/engines/rewards";
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
  const progress = progressToNextLevel(profile.xp);
  return Math.min(1, Math.max(0, progress.ratio));
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d8f1ff_0%,transparent_36%),radial-gradient(circle_at_88%_8%,#dbeafe_0%,transparent_34%),linear-gradient(180deg,#f8fdff_0%,#edf8ff_100%)] text-slate-900">
      <header className="border-b border-slate-200/90 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="text-xl font-semibold tracking-tight text-cyan-700"
            >
              Alt F4 Invest
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Level {profile.level}</Badge>
              <Badge variant="outline">{profile.coins} coins</Badge>
              <span className="text-sm text-slate-600">{userEmail}</span>
              <LogoutButton />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>XP {profile.xp}</span>
              <span>Streak {profile.streak} days</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50"
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
