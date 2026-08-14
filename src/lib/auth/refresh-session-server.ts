import type { SupabaseClient } from "@supabase/supabase-js";

import { shouldRefreshSession } from "@/lib/auth/session-cookie";

export type RefreshSessionResult = {
  userId: string | null;
  skipped: boolean;
  error: { status?: number; code?: string; message?: string } | null;
};

const inFlightRefreshes = new Map<string, Promise<RefreshSessionResult>>();

export function getSessionDedupeKey(cookieHeader: string) {
  const authCookie = cookieHeader.match(/sb-[^=;]+-auth-token[^;]*/)?.[0];

  if (authCookie) {
    return authCookie;
  }

  return cookieHeader.slice(0, 96) || "anonymous";
}

type RefreshSessionOptions = {
  cookieHeader?: string;
  forceRefresh?: boolean;
};

async function readSessionLocally(
  supabase: SupabaseClient,
): Promise<RefreshSessionResult> {
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return {
      userId: null,
      skipped: true,
      error: error
        ? {
            status: error.status,
            code: error.code,
            message: error.message,
          }
        : null,
    };
  }

  return {
    userId: String(data.claims.sub),
    skipped: true,
    error: null,
  };
}

export async function refreshSessionWithUser(
  supabase: SupabaseClient,
  dedupeKey: string,
  options: RefreshSessionOptions = {},
): Promise<RefreshSessionResult> {
  const { cookieHeader = "", forceRefresh = false } = options;
  const refreshKey = forceRefresh ? `${dedupeKey}:force` : dedupeKey;
  const existing = inFlightRefreshes.get(refreshKey);

  if (existing) {
    return existing;
  }

  const refreshPromise = (async () => {
    if (!forceRefresh && cookieHeader && !shouldRefreshSession(cookieHeader)) {
      return readSessionLocally(supabase);
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    return {
      userId: user?.id ?? null,
      skipped: false,
      error: error
        ? {
            status: error.status,
            code: error.code,
            message: error.message,
          }
        : null,
    };
  })().finally(() => {
    inFlightRefreshes.delete(refreshKey);
  });

  inFlightRefreshes.set(refreshKey, refreshPromise);
  return refreshPromise;
}
