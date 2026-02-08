"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function GoogleAuthButton({ label }: { label: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogleAuth = async () => {
    const supabase = createClient();
    setError(null);
    setIsLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (oauthError) {
        throw oauthError;
      }
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Unable to start Google login.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
        onClick={onGoogleAuth}
        disabled={isLoading}
      >
        {isLoading ? "Redirecting..." : label}
      </Button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
