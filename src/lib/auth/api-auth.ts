import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getApiErrorMessage } from "@/lib/auth/errors";
import {
  getSessionDedupeKey,
  refreshSessionWithUser,
} from "@/lib/auth/refresh-session-server";
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

function isInvalidSessionError(error: {
  status?: number;
  code?: string;
  message?: string;
}) {
  return (
    error.status === 401 ||
    error.status === 403 ||
    error.code === "refresh_token_not_found" ||
    error.message?.includes("Refresh Token")
  );
}

export async function requireClaims(
  request: NextRequest,
  supabase: SupabaseClient,
): Promise<AuthSuccess | AuthFailure> {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const { userId, error } = await refreshSessionWithUser(
      supabase,
      getSessionDedupeKey(cookieHeader),
    );

    if (error) {
      if (isInvalidSessionError(error)) {
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

    if (!userId) {
      return {
        ok: false,
        response: unauthorizedResponse(request),
      };
    }

    return {
      ok: true,
      userId,
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
