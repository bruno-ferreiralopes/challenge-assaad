"use server";

import { clearSessionCookies } from "@/lib/auth/session-cookies";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: boolean;
  email?: string;
};

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email e senha sao obrigatorios." };
  }

  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return { error: "Informe um email valido." };
  }

  if (!password.trim()) {
    return { error: "Informe sua senha.", email: trimmedEmail };
  }

  try {
    await clearSessionCookies();

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      return { error: getAuthErrorMessage(error), email: trimmedEmail };
    }
  } catch (error) {
    return { error: getAuthErrorMessage(error), email: trimmedEmail };
  }

  return { success: true };
}

export async function logoutAction(): Promise<{ success: true }> {
  await clearSessionCookies();
  return { success: true };
}
