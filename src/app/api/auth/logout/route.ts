import { NextResponse, type NextRequest } from "next/server";

import { clearSupabaseCookies } from "@/lib/auth/session-cookies";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  clearSupabaseCookies(request, response);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
