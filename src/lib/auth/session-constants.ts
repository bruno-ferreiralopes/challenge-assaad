export const SESSION_REFRESH_LOCK = "supabase-session-refresh";
export const SESSION_SYNC_CHANNEL = "supabase-session-sync";

export type SessionSyncMessage =
  | { type: "refresh-started"; tabId: string; at: string }
  | { type: "refresh-success"; tabId: string; at: string; userId?: string }
  | { type: "refresh-failed"; tabId: string; at: string; reason?: string };
