import { NextResponse, type NextRequest } from "next/server";

import { attachSessionCookies, requireClaims } from "@/lib/auth/api-auth";
import { createRequestClient } from "@/lib/supabase/request-client";

export async function GET(request: NextRequest) {
  const { supabase, supabaseResponse } = createRequestClient(request);
  const auth = await requireClaims(request, supabase);

  if (!auth.ok) {
    return auth.response;
  }

  return attachSessionCookies(
    NextResponse.json({
      status: "ok",
      auth: true,
      userId: auth.userId,
      checkedAt: new Date().toISOString(),
    }),
    supabaseResponse,
  );
}
