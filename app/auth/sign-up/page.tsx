import { SignUpForm } from "@/components/sign-up-form";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-[radial-gradient(circle_at_top,#1f3a67_0%,#0d1627_58%)] p-6 md:p-10">
      <div className="w-full max-w-sm space-y-4">
        <Link href="/auth" className="text-xs uppercase tracking-[0.2em] text-cyan-200">
          Alt F4 Invest
        </Link>
        <SignUpForm />
      </div>
    </div>
  );
}
