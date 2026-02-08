import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center bg-[radial-gradient(circle_at_15%_10%,#d8f2ff_0%,transparent_35%),radial-gradient(circle_at_85%_8%,#dbeafe_0%,transparent_30%),linear-gradient(180deg,#f8fdff_0%,#edf7ff_100%)]">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="h-16 w-full border-b border-slate-200/90 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between p-3 px-5 text-sm">
            <div className="flex items-center gap-5 font-semibold">
              <Link href={"/"} className="text-cyan-700">
                Alt F4 Invest
              </Link>
              <div className="flex items-center gap-2">
                <DeployButton />
              </div>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          {children}
        </div>

        <footer className="mx-auto flex w-full items-center justify-center gap-8 border-t border-slate-200 py-16 text-center text-xs text-slate-600">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
