"use client";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/env/supabase";
import type { SupabasePublicEnv } from "@/lib/env/schema";
import type { Database } from "@/types/database.generated";

export type ClerkTokenGetter = () => Promise<string | null>;

export function createBrowserSupabaseClient(
  getToken: ClerkTokenGetter,
  env: SupabasePublicEnv = getSupabasePublicEnv(),
) {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      accessToken: getToken,
    },
  );
}
