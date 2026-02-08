import type { User } from "@supabase/supabase-js";
import type { PlatformProfile } from "@/lib/types/platform";

type SupabaseLike = {
  from: (table: string) => any;
};

const DEFAULT_LEVEL = 1;

function usernameFromEmail(email: string | undefined, userId: string) {
  if (!email) {
    return `investor-${userId.slice(0, 6)}`;
  }
  return email.split("@")[0].slice(0, 24);
}

function rowToProfile(
  row: Record<string, unknown>,
  fallbackUser: User,
): PlatformProfile {
  return {
    userId:
      typeof row.user_id === "string" ? row.user_id : fallbackUser.id,
    username:
      typeof row.username === "string"
        ? row.username
        : usernameFromEmail(fallbackUser.email, fallbackUser.id),
    level: typeof row.level === "number" ? row.level : DEFAULT_LEVEL,
    xp: typeof row.xp === "number" ? row.xp : 0,
    coins: typeof row.coins === "number" ? row.coins : 0,
    streak: typeof row.streak === "number" ? row.streak : 0,
    streakFreezes: typeof row.streak_freezes === "number" ? row.streak_freezes : 1,
    discipline: typeof row.discipline === "number" ? row.discipline : 50,
    riskTolerance:
      typeof row.risk_tolerance === "number" ? row.risk_tolerance : 50,
    patience: typeof row.patience === "number" ? row.patience : 50,
    avatarCompleted:
      typeof row.avatar_completed === "boolean" ? row.avatar_completed : false,
    avatarConfig:
      row.avatar_config && typeof row.avatar_config === "object"
        ? (row.avatar_config as Record<string, unknown>)
        : null,
  };
}

function fallbackProfile(user: User): PlatformProfile {
  return {
    userId: user.id,
    username: usernameFromEmail(user.email, user.id),
    level: DEFAULT_LEVEL,
    xp: 0,
    coins: 0,
    streak: 0,
    streakFreezes: 1,
    discipline: 50,
    riskTolerance: 50,
    patience: 50,
    avatarCompleted: true,
    avatarConfig: null,
  };
}

function looksLikeMissingTable(errorMessage: string | undefined) {
  if (!errorMessage) {
    return false;
  }
  return (
    errorMessage.includes("relation") ||
    errorMessage.includes("does not exist") ||
    errorMessage.includes("schema cache")
  );
}

export async function ensureProfile(
  supabase: SupabaseLike,
  user: User,
): Promise<{ profile: PlatformProfile; storageReady: boolean }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data && !error) {
    return {
      profile: rowToProfile(data, user),
      storageReady: true,
    };
  }

  if (error && looksLikeMissingTable(error.message)) {
    return {
      profile: fallbackProfile(user),
      storageReady: false,
    };
  }

  const username = usernameFromEmail(user.email, user.id);

  const insertPayload = {
    user_id: user.id,
    username,
    level: DEFAULT_LEVEL,
    xp: 0,
    coins: 0,
    streak: 0,
    streak_freezes: 1,
    discipline: 50,
    risk_tolerance: 50,
    patience: 50,
    avatar_completed: false,
  };

  const insertResult = await supabase
    .from("profiles")
    .insert(insertPayload)
    .select("*")
    .maybeSingle();

  if (insertResult.data && !insertResult.error) {
    return {
      profile: rowToProfile(insertResult.data, user),
      storageReady: true,
    };
  }

  return {
    profile: fallbackProfile(user),
    storageReady: false,
  };
}
