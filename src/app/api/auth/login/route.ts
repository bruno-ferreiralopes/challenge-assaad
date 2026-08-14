import { NextRequest, NextResponse } from "next/server";

import { attachSessionCookies } from "@/lib/auth/api-auth";
import { getAuthErrorMessage, getAuthErrorStatus } from "@/lib/auth/errors";
import { clearSupabaseCookies } from "@/lib/auth/session-cookies";
import { createRequestClient } from "@/lib/supabase/request-client";

//Remove cookies do Supabase do request
function stripSupabaseCookies(request: NextRequest) {
  const headers = new Headers(request.headers);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const filteredCookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie && !cookie.startsWith("sb-"))
    .join("; ");

  if (filteredCookies) {
    headers.set("cookie", filteredCookies);
  } else {
    headers.delete("cookie");
  }

  return new NextRequest(request.url, {
    method: request.method,
    headers,
  });
}

type LoginValidationError = { error: string };
type LoginCredentials = { email: string; password: string };
//Parseia o body da request e retorna um objeto com o email e a senha
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

//Cria uma resposta de erro com o status e a mensagem
function errorResponse(
  request: NextRequest,
  message: string,
  status: number,
) {
  const response = NextResponse.json({ error: message }, { status });
  clearSupabaseCookies(request, response);
  return response;
}

//Rota para login
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

  const loginRequest = stripSupabaseCookies(request);
  const { supabase, supabaseResponse } = createRequestClient(loginRequest);

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

    return attachSessionCookies(
      NextResponse.json({ success: true }),
      supabaseResponse,
    );
  } catch (error) {
    return errorResponse(
      request,
      getAuthErrorMessage(error),
      getAuthErrorStatus(error),
    );
  }
}
