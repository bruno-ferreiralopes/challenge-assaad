"use server";

import { clearSessionCookies } from "@/lib/auth/session-cookies";
import { revokeSessionInBackground } from "@/lib/auth/logout-server";
import { createClient } from "@/lib/supabase/server";

//Logout action
export async function logoutAction(): Promise<{ success: true }> {
  const supabase = await createClient();
  revokeSessionInBackground(supabase);
  await clearSessionCookies();
  return { success: true };
}
