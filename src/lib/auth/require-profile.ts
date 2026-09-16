import "server-only";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { requireUser } from "./require-user";

export async function requireProfile() {
  const { userId } = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "user_id, username, display_name, headline, avatar_path, is_public",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to verify the current developer profile.", {
      cause: error,
    });
  }

  if (!profile) {
    redirect("/onboarding");
  }

  return { profile, userId };
}
