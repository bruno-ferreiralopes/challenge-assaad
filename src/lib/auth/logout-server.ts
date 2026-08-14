import type { SupabaseClient } from "@supabase/supabase-js";

export function revokeSessionInBackground(supabase: SupabaseClient) {
  void supabase.auth.signOut().catch(() => {
    // A limpeza local dos cookies ja encerrou a sessao no browser.
  });
}
