import type { SupabaseClient } from "@supabase/supabase-js";

export type RefreshSessionResult = {
  userId: string | null;
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

export async function refreshSessionWithUser(
  supabase: SupabaseClient,
  dedupeKey: string,
): Promise<RefreshSessionResult> {
  const existing = inFlightRefreshes.get(dedupeKey);

  if (existing) {
    return existing;
  }

  const refreshPromise = (async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    return {
      userId: user?.id ?? null,
      error: error
        ? {
            status: error.status,
            code: error.code,
            message: error.message,
          }
        : null,
    };
  })().finally(() => {
    inFlightRefreshes.delete(dedupeKey);
  });

  inFlightRefreshes.set(dedupeKey, refreshPromise);
  return refreshPromise;
}
