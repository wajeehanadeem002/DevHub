import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type TechnologyRow = Database["public"]["Tables"]["technologies"]["Row"];

export type PublicProfile = Pick<
  ProfileRow,
  | "avatar_path"
  | "bio"
  | "display_name"
  | "github_url"
  | "headline"
  | "linkedin_url"
  | "location"
  | "user_id"
  | "username"
  | "website_url"
> & {
  technologies: Pick<TechnologyRow, "id" | "name" | "slug">[];
};

export type PublicProfileDetails = Omit<
  PublicProfile,
  "avatar_path" | "user_id"
>;

export async function getPublicProfile(
  username: string,
): Promise<PublicProfile | null> {
  const normalizedUsername = username.trim().toLowerCase();
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient();
  } catch (error) {
    throw new Error("Unable to load this developer profile.", {
      cause: error,
    });
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "user_id, username, display_name, headline, bio, location, website_url, github_url, linkedin_url, avatar_path",
    )
    .eq("username", normalizedUsername)
    .eq("is_public", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load this developer profile.", { cause: error });
  }

  if (!profile) {
    return null;
  }

  const { data: selectionRows, error: selectionError } = await supabase
    .from("profile_technologies")
    .select("technology_id")
    .eq("user_id", profile.user_id)
    .order("technology_id", { ascending: true });

  if (selectionError) {
    throw new Error("Unable to load this developer profile.", {
      cause: selectionError,
    });
  }

  const technologyIds = (selectionRows ?? []).map(
    (selection) => selection.technology_id,
  );
  let technologies: PublicProfile["technologies"] = [];

  if (technologyIds.length > 0) {
    const { data, error: technologyError } = await supabase
      .from("technologies")
      .select("id, name, slug")
      .in("id", technologyIds)
      .order("sort_order", { ascending: true });

    if (technologyError) {
      throw new Error("Unable to load this developer profile.", {
        cause: technologyError,
      });
    }

    technologies = data ?? [];
  }

  return {
    avatar_path: profile.avatar_path,
    bio: profile.bio,
    display_name: profile.display_name,
    github_url: profile.github_url,
    headline: profile.headline,
    linkedin_url: profile.linkedin_url,
    location: profile.location,
    technologies,
    user_id: profile.user_id,
    username: profile.username,
    website_url: profile.website_url,
  };
}
