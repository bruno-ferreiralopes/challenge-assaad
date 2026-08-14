import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getApiErrorMessage } from "@/lib/auth/errors";
import { clearSupabaseCookies } from "@/lib/auth/session-cookies";

type AuthSuccess = {
  ok: true;
  userId: string;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

function unauthorizedResponse(request: NextRequest) {
  const response = NextResponse.json(
    { error: getApiErrorMessage(401) },
    { status: 401 },
  );
  clearSupabaseCookies(request, response);
  return response;
}

export async function requireClaims(
  request: NextRequest,
  supabase: SupabaseClient,
): Promise<AuthSuccess | AuthFailure> {
  try {
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      const status = error.status ?? 503;

      if (status === 401 || status === 403) {
        return {
          ok: false,
          response: unauthorizedResponse(request),
        };
      }

      return {
        ok: false,
        response: NextResponse.json(
          { error: getApiErrorMessage(503) },
          { status: 503 },
        ),
      };
    }

    if (!data?.claims?.sub) {
      return {
        ok: false,
        response: unauthorizedResponse(request),
      };
    }

    return {
      ok: true,
      userId: String(data.claims.sub),
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: getApiErrorMessage(503) },
        { status: 503 },
      ),
    };
  }
}

export function attachSessionCookies(
  jsonResponse: NextResponse,
  supabaseResponse: NextResponse,
) {
  supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
    jsonResponse.cookies.set(name, value);
  });
  jsonResponse.headers.set("Cache-Control", "private, no-store");
  return jsonResponse;
}
