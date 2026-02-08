"use client";

import { useState } from "react";
import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";

type AuthMode = "login" | "signup";

export function AuthGateway() {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <section className="mx-auto w-full max-w-md space-y-4">
      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-2 backdrop-blur">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "login" ? "default" : "ghost"}
            className={
              mode === "login"
                ? "bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300"
                : "text-slate-200 hover:bg-white/10"
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
                ? "bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300"
                : "text-slate-200 hover:bg-white/10"
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
