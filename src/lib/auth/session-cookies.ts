import { cookies } from "next/headers";
import { type NextRequest, type NextResponse } from "next/server";

import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-");
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();

  for (const { name } of cookieStore.getAll()) {
    if (isSupabaseAuthCookie(name)) {
      cookieStore.set(name, "", {
        ...supabaseCookieOptions,
        maxAge: 0,
      });
    }
  }
}

export function clearSupabaseCookies(
  request: NextRequest,
  response: NextResponse,
) {
  request.cookies.getAll().forEach(({ name }) => {
    if (isSupabaseAuthCookie(name)) {
      response.cookies.set(name, "", {
        ...supabaseCookieOptions,
        maxAge: 0,
      });
    }
  });
}
