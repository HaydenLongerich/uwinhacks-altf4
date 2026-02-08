import { levelFromXp } from "@/lib/engines/rewards";

interface SupabaseQueryResult {
  data?: Record<string, unknown> | null;
  error: { message?: string } | null;
}

type SupabaseQueryBuilder = {
  select: (...args: unknown[]) => SupabaseQueryBuilder;
  insert: (...args: unknown[]) => SupabaseQueryBuilder;
  update: (...args: unknown[]) => SupabaseQueryBuilder;
  eq: (...args: unknown[]) => SupabaseQueryBuilder & Promise<SupabaseQueryResult>;
  maybeSingle: (...args: unknown[]) => Promise<SupabaseQueryResult>;
};

type SupabaseLike = {
  from: (table: string) => unknown;
  auth?: {
    getUser?: () => Promise<{
      data?: {
        user?: {
          user_metadata?: Record<string, unknown>;
        } | null;
      };
      error?: { message?: string } | null;
    }>;
    updateUser?: (attributes: {
      data: Record<string, unknown>;
    }) => Promise<{
      data?: unknown;
      error?: { message?: string } | null;
    }>;
  };
};
type ProfileIdentityColumn = "user_id" | "id";

function profilesTable(supabase: SupabaseLike) {
  return supabase.from("profiles") as SupabaseQueryBuilder;
}

interface BehaviorPatch {
  discipline: number;
  riskTolerance: number;
  patience: number;
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function todayUtcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateKeyFromUnknown(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function previousUtcDateKey(dayKey: string) {
  const day = new Date(`${dayKey}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

function computeDailyStreak({
  currentStreak,
  lastStreakDate,
  hasActivity,
  today,
}: {
  currentStreak: number;
  lastStreakDate: unknown;
  hasActivity: boolean;
  today: string;
}) {
  const safeStreak = Math.max(0, Math.round(currentStreak));
  const lastDay = dateKeyFromUnknown(lastStreakDate);

  if (!hasActivity) {
    return {
      nextStreak: safeStreak,
      nextStreakDate: lastDay,
    };
  }

  if (lastDay === today) {
    return {
      nextStreak: safeStreak,
      nextStreakDate: lastDay,
    };
  }

  if (!lastDay) {
    return {
      nextStreak: Math.max(1, safeStreak),
      nextStreakDate: today,
    };
  }

  if (lastDay === previousUtcDateKey(today)) {
    return {
      nextStreak: Math.max(1, safeStreak + 1),
      nextStreakDate: today,
    };
  }

  return {
    nextStreak: 1,
    nextStreakDate: today,
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

function missingColumnFromError(errorMessage: string | undefined) {
  if (!errorMessage) {
    return null;
  }
  const match = errorMessage.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i);
  return match?.[1] ?? null;
}

const DEFAULT_PROFILE_ROW = {
  level: 0,
  xp: 0,
  coins: 0,
  streak: 0,
  streak_freezes: 0,
  discipline: 0,
  risk_tolerance: 0,
  patience: 0,
  avatar_completed: false,
};

async function selectProfileForProgress(
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

async function ensureProfileRowForProgress(
  supabase: SupabaseLike,
  userId: string,
  preferredIdentity: ProfileIdentityColumn,
) {
  const identities: ProfileIdentityColumn[] =
    preferredIdentity === "user_id" ? ["user_id", "id"] : ["id", "user_id"];

  for (const identityColumn of identities) {
    const basePayload = {
      [identityColumn]: userId,
      username: `investor-${userId.slice(0, 6)}`,
      ...DEFAULT_PROFILE_ROW,
    };

    const insertResult = await profilesTable(supabase)
      .insert(basePayload)
      .select("*")
      .maybeSingle();

    if (insertResult.data && !insertResult.error) {
      return {
        data: insertResult.data as Record<string, unknown>,
        error: null,
        identityColumn,
      };
    }

    if (
      insertResult.error &&
      looksLikeMissingColumn(insertResult.error.message, "username")
    ) {
      const withoutUsernamePayload = {
        [identityColumn]: userId,
        ...DEFAULT_PROFILE_ROW,
      };
      const fallbackInsert = await profilesTable(supabase)
        .insert(withoutUsernamePayload)
        .select("*")
        .maybeSingle();
      if (fallbackInsert.data && !fallbackInsert.error) {
        return {
          data: fallbackInsert.data as Record<string, unknown>,
          error: null,
          identityColumn,
        };
      }
      if (
        fallbackInsert.error &&
        looksLikeDuplicateKey(fallbackInsert.error.message)
      ) {
        const existing = await profilesTable(supabase)
          .select("*")
          .eq(identityColumn, userId)
          .maybeSingle();
        if (existing.data && !existing.error) {
          return {
            data: existing.data as Record<string, unknown>,
            error: null,
            identityColumn,
          };
        }
      }
      if (
        fallbackInsert.error &&
        looksLikeMissingColumn(fallbackInsert.error.message, identityColumn)
      ) {
        continue;
      }
      return {
        data: null,
        error: fallbackInsert.error,
        identityColumn,
      };
    }

    if (insertResult.error && looksLikeDuplicateKey(insertResult.error.message)) {
      const existing = await profilesTable(supabase)
        .select("*")
        .eq(identityColumn, userId)
        .maybeSingle();
      if (existing.data && !existing.error) {
        return {
          data: existing.data as Record<string, unknown>,
          error: null,
          identityColumn,
        };
      }
    }

    if (
      insertResult.error &&
      looksLikeMissingColumn(insertResult.error.message, identityColumn)
    ) {
      continue;
    }

    return {
      data: null,
      error: insertResult.error,
      identityColumn,
    };
  }

  return {
    data: null,
    error: { message: "Could not create profile row with available schema columns." },
    identityColumn: preferredIdentity,
  };
}

async function updateProfileWithColumnFallback({
  supabase,
  userId,
  identityColumn,
  payload,
}: {
  supabase: SupabaseLike;
  userId: string;
  identityColumn: ProfileIdentityColumn;
  payload: Record<string, number | string>;
}): Promise<{ ok: boolean; error?: string }> {
  const currentPayload = { ...payload };

  while (Object.keys(currentPayload).length > 0) {
    const { error } = await profilesTable(supabase)
      .update(currentPayload)
      .eq(identityColumn, userId);

    if (!error) {
      return { ok: true };
    }

    const missingColumn = missingColumnFromError(error.message);
    if (missingColumn && missingColumn in currentPayload) {
      delete currentPayload[missingColumn];
      continue;
    }

    return { ok: false, error: error.message };
  }

  return {
    ok: false,
    error: "Profile update payload has no compatible columns in current schema.",
  };
}

function blendBehavior(current: number, incoming: number) {
  const blended = current * 0.65 + incoming * 0.35;
  return Number(clamp(blended, 0, 100).toFixed(1));
}

async function applyAuthMetadataProgress({
  supabase,
  xpDelta,
  coinsDelta,
  streakDelta,
  behavior,
}: {
  supabase: SupabaseLike;
  xpDelta: number;
  coinsDelta: number;
  streakDelta: number;
  behavior?: BehaviorPatch;
}): Promise<{ ok: boolean; error?: string }> {
  if (
    !supabase.auth ||
    typeof supabase.auth.getUser !== "function" ||
    typeof supabase.auth.updateUser !== "function"
  ) {
    return {
      ok: false,
      error: "Supabase auth API is unavailable for metadata fallback.",
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return {
      ok: false,
      error:
        userError?.message ?? "Could not load signed-in user for rewards fallback.",
    };
  }

  const metadata =
    userData.user.user_metadata &&
    typeof userData.user.user_metadata === "object"
      ? userData.user.user_metadata
      : {};

  const currentXp = toNumber(metadata.xp, 0);
  const currentCoins = toNumber(metadata.coins, 0);
  const currentStreak = toNumber(metadata.streak, 0);
  const today = todayUtcDateKey();
  const streakState = computeDailyStreak({
    currentStreak,
    lastStreakDate: metadata.last_streak_date ?? metadata.updated_at,
    hasActivity: streakDelta > 0,
    today,
  });
  const nextXp = Math.max(0, Math.round(currentXp + xpDelta));
  const nextCoins = Math.max(0, Math.round(currentCoins + coinsDelta));
  const nextStreak = streakState.nextStreak;

  const nextMetadata: Record<string, unknown> = {
    ...metadata,
    level: levelFromXp(nextXp),
    xp: nextXp,
    coins: nextCoins,
    streak: nextStreak,
  };

  if (streakDelta > 0) {
    nextMetadata.last_streak_date = streakState.nextStreakDate ?? today;
  }

  if (behavior) {
    const currentDiscipline = toNumber(metadata.discipline, 0);
    const currentRiskTolerance = toNumber(
      metadata.risk_tolerance ?? metadata.riskTolerance,
      0,
    );
    const currentPatience = toNumber(metadata.patience, 0);

    const discipline = blendBehavior(currentDiscipline, behavior.discipline);
    const riskTolerance = blendBehavior(
      currentRiskTolerance,
      behavior.riskTolerance,
    );
    const patience = blendBehavior(currentPatience, behavior.patience);

    nextMetadata.discipline = discipline;
    nextMetadata.risk_tolerance = riskTolerance;
    nextMetadata.riskTolerance = riskTolerance;
    nextMetadata.patience = patience;
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: nextMetadata,
  });

  if (updateError) {
    return {
      ok: false,
      error: updateError.message,
    };
  }

  return { ok: true };
}

export async function applyProfileProgress({
  supabase,
  userId,
  xpDelta = 0,
  coinsDelta = 0,
  streakDelta = 0,
  behavior,
}: {
  supabase: SupabaseLike;
  userId: string;
  xpDelta?: number;
  coinsDelta?: number;
  streakDelta?: number;
  behavior?: BehaviorPatch;
}): Promise<{ ok: boolean; storageReady: boolean; error?: string }> {
  const lookup = await selectProfileForProgress(supabase, userId);
  let data = lookup.data;
  const error = lookup.error;
  const identityColumn = lookup.identityColumn;

  if (error) {
    const fallback = await applyAuthMetadataProgress({
      supabase,
      xpDelta,
      coinsDelta,
      streakDelta,
      behavior,
    });
    if (fallback.ok) {
      return { ok: true, storageReady: false };
    }

    return {
      ok: false,
      storageReady: !looksLikeMissingTable(error.message),
      error: fallback.error ?? error.message,
    };
  }

  if (!data) {
    const insertResult = await ensureProfileRowForProgress(
      supabase,
      userId,
      identityColumn,
    );
    if (insertResult.error || !insertResult.data) {
      const fallback = await applyAuthMetadataProgress({
        supabase,
        xpDelta,
        coinsDelta,
        streakDelta,
        behavior,
      });
      if (fallback.ok) {
        return { ok: true, storageReady: false };
      }

      return {
        ok: false,
        storageReady: !looksLikeMissingTable(insertResult.error?.message),
        error:
          fallback.error ??
          insertResult.error?.message ??
          "Profile row not found and auto-create failed.",
      };
    }
    data = insertResult.data;
  }

  const profileData: Record<string, unknown> = data ?? {};
  const currentXp = toNumber(profileData.xp, 0);
  const currentCoins = toNumber(profileData.coins, 0);
  const currentStreak = toNumber(profileData.streak, 0);
  const today = todayUtcDateKey();
  const streakState = computeDailyStreak({
    currentStreak,
    lastStreakDate: profileData.last_streak_date ?? profileData.updated_at,
    hasActivity: streakDelta > 0,
    today,
  });
  const nextXp = Math.max(0, Math.round(currentXp + xpDelta));
  const nextCoins = Math.max(0, Math.round(currentCoins + coinsDelta));
  const nextStreak = streakState.nextStreak;

  const updatePayload: Record<string, number | string> = {
    level: levelFromXp(nextXp),
    xp: nextXp,
    coins: nextCoins,
    streak: nextStreak,
  };

  if (streakDelta > 0) {
    updatePayload.last_streak_date = streakState.nextStreakDate ?? today;
  }

  if (behavior) {
    const currentDiscipline = toNumber(profileData.discipline, 0);
    const currentRiskTolerance = toNumber(profileData.risk_tolerance, 0);
    const currentPatience = toNumber(profileData.patience, 0);

    updatePayload.discipline = blendBehavior(
      currentDiscipline,
      behavior.discipline,
    );
    updatePayload.risk_tolerance = blendBehavior(
      currentRiskTolerance,
      behavior.riskTolerance,
    );
    updatePayload.patience = blendBehavior(currentPatience, behavior.patience);
  }

  const updateResult = await updateProfileWithColumnFallback({
    supabase,
    userId,
    identityColumn,
    payload: updatePayload,
  });

  if (!updateResult.ok) {
    const fallback = await applyAuthMetadataProgress({
      supabase,
      xpDelta,
      coinsDelta,
      streakDelta,
      behavior,
    });
    if (fallback.ok) {
      return { ok: true, storageReady: false };
    }

    return {
      ok: false,
      storageReady: !looksLikeMissingTable(updateResult.error),
      error: fallback.error ?? updateResult.error,
    };
  }

  return { ok: true, storageReady: true };
}
