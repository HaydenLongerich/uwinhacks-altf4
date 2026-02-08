import { LoginForm } from "@/components/login-form";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-[radial-gradient(circle_at_16%_14%,#d7f0ff_0%,transparent_34%),radial-gradient(circle_at_86%_12%,#dbeafe_0%,transparent_32%),linear-gradient(180deg,#f9fdff_0%,#eef8ff_100%)] p-6 md:p-10">
      <div className="w-full max-w-sm space-y-4">
        <Link href="/auth" className="text-xs uppercase tracking-[0.2em] text-cyan-700">
          Alt F4 Invest
        </Link>
        <LoginForm />
      </div>
    </div>
  );
}
