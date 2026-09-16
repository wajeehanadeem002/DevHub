import "server-only";

import { requireUser } from "@/lib/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

import type { ProfileInput } from "./profile-input";
import type { ProfileEditInput } from "./profile-edit-input";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type CurrentProfile = Pick<
  ProfileRow,
  | "avatar_path"
  | "bio"
  | "display_name"
  | "github_url"
  | "headline"
  | "is_public"
  | "linkedin_url"
  | "location"
  | "user_id"
  | "username"
  | "website_url"
> & { technologyIds: number[] };

export type TechnologyOption = Pick<
  Database["public"]["Tables"]["technologies"]["Row"],
  "id" | "name" | "slug"
>;

export async function getCurrentProfile() {
  const { userId } = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "user_id, username, display_name, headline, bio, location, website_url, github_url, linkedin_url, avatar_path, is_public",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load the current developer profile.", {
      cause: error,
    });
  }

  if (!profile) {
    return { profile: null, userId };
  }

  const { data: technologyRows, error: technologyError } = await supabase
    .from("profile_technologies")
    .select("technology_id")
    .eq("user_id", userId)
    .order("technology_id", { ascending: true });

  if (technologyError) {
    throw new Error("Unable to load the current developer profile.", {
      cause: technologyError,
    });
  }

  return {
    profile: {
      ...profile,
      technologyIds: (technologyRows ?? []).map(
        (technology) => technology.technology_id,
      ),
    },
    userId,
  };
}

export async function getTechnologyOptions(): Promise<TechnologyOption[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("technologies")
    .select("id, name, slug")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Unable to load the curated technologies.", {
      cause: error,
    });
  }

  return data ?? [];
}

export async function createCurrentProfile(input: ProfileInput) {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("profiles").insert(input);

  if (!error) {
    return "created" as const;
  }

  if (error.code === "23505") {
    return "username-taken" as const;
  }

  throw new Error("Unable to create the developer profile.", {
    cause: error,
  });
}

export async function updateCurrentProfile(input: ProfileEditInput) {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_current_profile", {
    p_bio: input.bio,
    p_display_name: input.display_name,
    p_github_url: input.github_url,
    p_headline: input.headline,
    p_is_public: input.is_public,
    p_linkedin_url: input.linkedin_url,
    p_location: input.location,
    p_technology_ids: input.technologyIds,
    p_username: input.username,
    p_website_url: input.website_url,
  });

  if (!error) {
    return "updated" as const;
  }

  if (error.code === "23505") {
    return "username-taken" as const;
  }

  throw new Error("Unable to update the developer profile.", {
    cause: error,
  });
}
