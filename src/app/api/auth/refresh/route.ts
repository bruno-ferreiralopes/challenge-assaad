import { NextResponse, type NextRequest } from "next/server";

import { attachSessionCookies } from "@/lib/auth/api-auth";
import { getApiErrorMessage } from "@/lib/auth/errors";
import { isInvalidSessionError } from "@/lib/auth/invalid-session";
import {
  getSessionDedupeKey,
  refreshSessionWithUser,
} from "@/lib/auth/refresh-session-server";
import { clearSupabaseCookies } from "@/lib/auth/session-cookies";
import { createRequestClient } from "@/lib/supabase/request-client";

//Rota para refresh
export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  if (!cookieHeader.includes("sb-")) {
    return NextResponse.json(
      { success: false, error: getApiErrorMessage(401) },
      { status: 401 },
    );
  }

  let forceRefresh = false;

  try {
    const body = (await request.json()) as { force?: boolean };
    forceRefresh = body.force === true;
  } catch {
    forceRefresh = false;
  }

  const { supabase, supabaseResponse } = createRequestClient(request);
  const { userId, skipped, error } = await refreshSessionWithUser(
    supabase,
    getSessionDedupeKey(cookieHeader),
    { cookieHeader, forceRefresh },
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
    NextResponse.json({ success: true, userId, skipped }),
    supabaseResponse,
  );
}
