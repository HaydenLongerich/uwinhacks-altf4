"use client";

import { useState } from "react";
import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";

type AuthMode = "login" | "signup";

export function AuthGateway({ initialMode = "login" }: { initialMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  return (
    <section className="mx-auto w-full max-w-md space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "login" ? "default" : "ghost"}
            className={
              mode === "login"
                ? "bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
                : "text-slate-700 hover:bg-white"
            }
            onClick={() => setMode("login")}
          >
            Login
          </Button>
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "ghost"}
            className={
              mode === "signup"
                ? "bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
                : "text-slate-700 hover:bg-white"
            }
            onClick={() => setMode("signup")}
          >
            Sign Up
          </Button>
        </div>
      </div>
      {mode === "login" ? <LoginForm /> : <SignUpForm />}
    </section>
  );
}
