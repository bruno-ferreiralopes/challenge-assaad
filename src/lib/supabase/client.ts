import { createBrowserClient } from "@supabase/ssr";

import { supabaseFetch } from "./fetch-with-timeout";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: supabaseFetch,
    },
  });

  return browserClient;
}
