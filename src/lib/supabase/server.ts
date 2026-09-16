import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/env/supabase";
import type { SupabasePublicEnv } from "@/lib/env/schema";
import type { Database } from "@/types/database.generated";

export function createServerSupabasePublicClient(
  env: SupabasePublicEnv = getSupabasePublicEnv(),
) {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export async function createServerSupabaseClient(
  env: SupabasePublicEnv = getSupabasePublicEnv(),
) {
  const { getToken } = await auth();

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      accessToken: () => getToken(),
    },
  );
}
