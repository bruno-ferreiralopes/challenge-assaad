import { NextRequest, NextResponse } from "next/server";

import { attachSessionCookies } from "@/lib/auth/api-auth";
import { getAuthErrorMessage, getAuthErrorStatus } from "@/lib/auth/errors";
import { clearSupabaseCookies } from "@/lib/auth/session-cookies";
import { createLoginClient } from "@/lib/supabase/login-client";

type LoginValidationError = { error: string };
type LoginCredentials = { email: string; password: string };

function parseLoginBody(body: unknown): LoginValidationError | LoginCredentials {
  if (typeof body !== "object" || body === null) {
    return { error: "Email e senha sao obrigatorios." };
  }

  const { email, password } = body as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email e senha sao obrigatorios." };
  }

  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return { error: "Informe um email valido." };
  }

  if (!password.trim()) {
    return { error: "Informe sua senha." };
  }

  return { email: trimmedEmail, password };
}

function errorResponse(
  request: NextRequest,
  message: string,
  status: number,
) {
  const response = NextResponse.json({ error: message }, { status });
  clearSupabaseCookies(request, response);
  return response;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(
      request,
      "Email e senha sao obrigatorios.",
      400,
    );
  }

  const parsed = parseLoginBody(body);

  if ("error" in parsed) {
    return errorResponse(request, parsed.error, 400);
  }

  const { email, password } = parsed;
  const { supabase, getSupabaseResponse } = createLoginClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return errorResponse(
        request,
        getAuthErrorMessage(error),
        getAuthErrorStatus(error),
      );
    }

    const response = NextResponse.json({ success: true });
    clearSupabaseCookies(request, response);

    return attachSessionCookies(response, getSupabaseResponse());
  } catch (error) {
    return errorResponse(
      request,
      getAuthErrorMessage(error),
      getAuthErrorStatus(error),
    );
  }
}
