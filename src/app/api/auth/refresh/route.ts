import { NextResponse, type NextRequest } from "next/server";

import { attachSessionCookies } from "@/lib/auth/api-auth";
import { getApiErrorMessage } from "@/lib/auth/errors";
import {
  getSessionDedupeKey,
  refreshSessionWithUser,
} from "@/lib/auth/refresh-session-server";
import { clearSupabaseCookies } from "@/lib/auth/session-cookies";
import { createRequestClient } from "@/lib/supabase/request-client";

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

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  if (!cookieHeader.includes("sb-")) {
    return NextResponse.json(
      { success: false, error: getApiErrorMessage(401) },
      { status: 401 },
    );
  }

  const { supabase, supabaseResponse } = createRequestClient(request);
  const { userId, error } = await refreshSessionWithUser(
    supabase,
    getSessionDedupeKey(cookieHeader),
  );

  if (error && isInvalidSessionError(error)) {
    const response = NextResponse.json(
      { success: false, error: getApiErrorMessage(401) },
      { status: 401 },
    );
    clearSupabaseCookies(request, response);
    return response;
  }

  if (error || !userId) {
    return NextResponse.json(
      { success: false, error: getApiErrorMessage(503) },
      { status: 503 },
    );
  }

  return attachSessionCookies(
    NextResponse.json({ success: true, userId }),
    supabaseResponse,
  );
}
