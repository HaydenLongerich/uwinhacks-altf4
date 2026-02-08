import type { User } from "@supabase/supabase-js";
import { levelFromXp } from "@/lib/engines/rewards";
import type { PlatformProfile } from "@/lib/types/platform";

interface SupabaseQueryResult {
  data?: Record<string, unknown> | null;
  error: { message?: string } | null;
}

type SupabaseQueryBuilder = {
  select: (...args: unknown[]) => SupabaseQueryBuilder;
  insert: (...args: unknown[]) => SupabaseQueryBuilder;
  eq: (...args: unknown[]) => SupabaseQueryBuilder & Promise<SupabaseQueryResult>;
  maybeSingle: (...args: unknown[]) => Promise<SupabaseQueryResult>;
};

type SupabaseLike = {
  from: (table: string) => unknown;
};

const DEFAULT_LEVEL = 0;
type ProfileIdentityColumn = "user_id" | "id";

function profilesTable(supabase: SupabaseLike) {
  return supabase.from("profiles") as SupabaseQueryBuilder;
}

function usernameFromEmail(email: string | undefined, userId: string) {
  if (!email) {
    return `investor-${userId.slice(0, 6)}`;
  }
  return email.split("@")[0].slice(0, 24);
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function rowToProfile(
  row: Record<string, unknown>,
  fallbackUser: User,
): PlatformProfile {
  const xp = typeof row.xp === "number" ? row.xp : 0;
  return {
    userId:
      typeof row.user_id === "string" ? row.user_id : fallbackUser.id,
    username:
      typeof row.username === "string"
        ? row.username
        : usernameFromEmail(fallbackUser.email, fallbackUser.id),
    level: typeof row.level === "number" ? row.level : levelFromXp(xp),
    xp,
    coins: typeof row.coins === "number" ? row.coins : 0,
    streak: typeof row.streak === "number" ? row.streak : 0,
    streakFreezes: typeof row.streak_freezes === "number" ? row.streak_freezes : 0,
    discipline: typeof row.discipline === "number" ? row.discipline : 0,
    riskTolerance:
      typeof row.risk_tolerance === "number" ? row.risk_tolerance : 0,
    patience: typeof row.patience === "number" ? row.patience : 0,
    avatarCompleted:
      typeof row.avatar_completed === "boolean" ? row.avatar_completed : false,
    avatarConfig:
      row.avatar_config && typeof row.avatar_config === "object"
        ? (row.avatar_config as Record<string, unknown>)
        : null,
  };
}

function fallbackProfile(user: User): PlatformProfile {
  const metadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};
  const xp = toNumber(metadata.xp, 0);
  const riskTolerance = toNumber(
    metadata.risk_tolerance ?? metadata.riskTolerance,
    0,
  );

  return {
    userId: user.id,
    username:
      typeof metadata.username === "string"
        ? metadata.username
        : usernameFromEmail(user.email, user.id),
    level:
      typeof metadata.level === "number" ? metadata.level : levelFromXp(xp),
    xp,
    coins: toNumber(metadata.coins, 0),
    streak: toNumber(metadata.streak, 0),
    streakFreezes: toNumber(metadata.streak_freezes, 0),
    discipline: toNumber(metadata.discipline, 0),
    riskTolerance,
    patience: toNumber(metadata.patience, 0),
    avatarCompleted:
      typeof metadata.avatar_completed === "boolean"
        ? metadata.avatar_completed
        : true,
    avatarConfig:
      metadata.avatar_config && typeof metadata.avatar_config === "object"
        ? (metadata.avatar_config as Record<string, unknown>)
        : null,
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

function looksLikeMissingColumn(
  errorMessage: string | undefined,
  column: string,
) {
  if (!errorMessage) {
    return false;
  }
  const lower = errorMessage.toLowerCase();
  return (
    lower.includes("column") &&
    lower.includes(column.toLowerCase()) &&
    (lower.includes("does not exist") || lower.includes("schema cache"))
  );
}

function looksLikeDuplicateKey(errorMessage: string | undefined) {
  if (!errorMessage) {
    return false;
  }
  const lower = errorMessage.toLowerCase();
  return lower.includes("duplicate key") || lower.includes("unique constraint");
}

async function selectProfileByIdentity(
  supabase: SupabaseLike,
  userId: string,
): Promise<{
  data: Record<string, unknown> | null;
  error: { message?: string } | null;
  identityColumn: ProfileIdentityColumn;
}> {
  const byUserId = await profilesTable(supabase)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (byUserId.data && !byUserId.error) {
    return {
      data: byUserId.data,
      error: byUserId.error,
      identityColumn: "user_id",
    };
  }

  if (
    byUserId.error &&
    !looksLikeMissingColumn(byUserId.error?.message, "user_id")
  ) {
    return {
      data: null,
      error: byUserId.error,
      identityColumn: "user_id",
    };
  }

  const byId = await profilesTable(supabase)
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (byId.data && !byId.error) {
    return {
      data: byId.data,
      error: null,
      identityColumn: "id",
    };
  }

  if (byId.error && !looksLikeMissingColumn(byId.error?.message, "id")) {
    return {
      data: null,
      error: byId.error,
      identityColumn: "id",
    };
  }

  return {
    data: null,
    error: null,
    identityColumn:
      byUserId.error && looksLikeMissingColumn(byUserId.error?.message, "user_id")
        ? "id"
        : "user_id",
  };
}

async function insertProfileWithFallback(
  supabase: SupabaseLike,
  user: User,
  preferredIdentity: ProfileIdentityColumn,
) {
  const username = usernameFromEmail(user.email, user.id);
  const identities: ProfileIdentityColumn[] =
    preferredIdentity === "user_id" ? ["user_id", "id"] : ["id", "user_id"];

  for (const identityColumn of identities) {
    const fullPayload = {
      [identityColumn]: user.id,
      username,
      level: DEFAULT_LEVEL,
      xp: 0,
      coins: 0,
      streak: 0,
      streak_freezes: 0,
      discipline: 0,
      risk_tolerance: 0,
      patience: 0,
      avatar_completed: false,
    };

    const fullInsert = await profilesTable(supabase)
      .insert(fullPayload)
      .select("*")
      .maybeSingle();

    if (fullInsert.data && !fullInsert.error) {
      return { data: fullInsert.data as Record<string, unknown>, error: null };
    }

    if (
      fullInsert.error &&
      looksLikeMissingColumn(fullInsert.error.message, "username")
    ) {
      const minimalPayload = {
        [identityColumn]: user.id,
        level: DEFAULT_LEVEL,
        xp: 0,
        coins: 0,
        streak: 0,
      };
      const minimalInsert = await profilesTable(supabase)
        .insert(minimalPayload)
        .select("*")
        .maybeSingle();
      if (minimalInsert.data && !minimalInsert.error) {
        return {
          data: minimalInsert.data as Record<string, unknown>,
          error: null,
        };
      }
      if (
        minimalInsert.error &&
        looksLikeDuplicateKey(minimalInsert.error.message)
      ) {
        const existing = await profilesTable(supabase)
          .select("*")
          .eq(identityColumn, user.id)
          .maybeSingle();
        if (existing.data && !existing.error) {
          return {
            data: existing.data as Record<string, unknown>,
            error: null,
          };
        }
      }
      if (
        minimalInsert.error &&
        looksLikeMissingColumn(minimalInsert.error.message, identityColumn)
      ) {
        continue;
      }
      return { data: null, error: minimalInsert.error };
    }

    if (fullInsert.error && looksLikeDuplicateKey(fullInsert.error.message)) {
      const existing = await profilesTable(supabase)
        .select("*")
        .eq(identityColumn, user.id)
        .maybeSingle();
      if (existing.data && !existing.error) {
        return {
          data: existing.data as Record<string, unknown>,
          error: null,
        };
      }
    }

    if (
      fullInsert.error &&
      looksLikeMissingColumn(fullInsert.error.message, identityColumn)
    ) {
      continue;
    }

    return { data: null, error: fullInsert.error };
  }

  return {
    data: null,
    error: { message: "Could not insert profile row with available identity columns." },
  };
}

export async function ensureProfile(
  supabase: SupabaseLike,
  user: User,
): Promise<{ profile: PlatformProfile; storageReady: boolean }> {
  const lookup = await selectProfileByIdentity(supabase, user.id);
  const data = lookup.data;
  const error = lookup.error;
  const identityColumn = lookup.identityColumn;

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

  const insertResult = await insertProfileWithFallback(
    supabase,
    user,
    identityColumn,
  );

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
