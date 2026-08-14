import { NextResponse, type NextRequest } from "next/server";

import { revokeSessionInBackground } from "@/lib/auth/logout-server";
import { clearSupabaseCookies } from "@/lib/auth/session-cookies";
import { createRequestClient } from "@/lib/supabase/request-client";

//Rota para logout
export async function POST(request: NextRequest) {
  //Cria um cliente do Supabase com a request
  const { supabase } = createRequestClient(request);
  revokeSessionInBackground(supabase);

  const response = NextResponse.json({ success: true });
  clearSupabaseCookies(request, response);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
