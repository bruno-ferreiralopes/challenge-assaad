import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

import { supabaseCookieOptions } from "./cookie-options";
import { supabaseFetch } from "./fetch-with-timeout";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export function createLoginClient() {
  const sessionResponse = {
    current: NextResponse.next(),
  };

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: supabaseCookieOptions,
    global: {
      fetch: supabaseFetch,
    },
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookiesToSet, cacheHeaders) {
        sessionResponse.current = NextResponse.next();
        cookiesToSet.forEach(({ name, value, options }) =>
          sessionResponse.current.cookies.set(name, value, options),
        );
        Object.entries(cacheHeaders).forEach(([key, value]) =>
          sessionResponse.current.headers.set(key, value),
        );
      },
    },
  });

  return {
    supabase,
    getSupabaseResponse() {
      return sessionResponse.current;
    },
  };
}
