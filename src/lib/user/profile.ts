import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  email: string | undefined;
  lastSignInAt: string | undefined;
};

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function mapClaimsToProfile(claims: Record<string, unknown>): UserProfile {
  const issuedAt =
    typeof claims.iat === "number"
      ? new Date(claims.iat * 1000).toISOString()
      : new Date().toISOString();

  return {
    id: String(claims.sub),
    email: typeof claims.email === "string" ? claims.email : undefined,
    lastSignInAt: issuedAt,
  };
}

export async function getUserProfileFromClient(
  supabase: SupabaseClient,
): Promise<UserProfile | null> {
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return null;
  }

  return mapClaimsToProfile(data.claims as Record<string, unknown>);
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  return getUserProfileFromClient(supabase);
}
