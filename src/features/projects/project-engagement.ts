import "server-only";

import { auth } from "@clerk/nextjs/server";

import { requireProfile } from "@/lib/auth/require-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { parseProjectId } from "./project-input";

export type ProjectEngagementState = {
  isOwner: boolean;
  isSignedIn: boolean;
  liked: boolean;
  saved: boolean;
};

const emptySignedOutState: ProjectEngagementState = {
  isOwner: false,
  isSignedIn: false,
  liked: false,
  saved: false,
};

function requireProjectId(projectId: string) {
  const parsedProjectId = parseProjectId(projectId);

  if (!parsedProjectId.success) {
    throw new Error("Invalid project ID.");
  }

  return parsedProjectId.data;
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function getProjectEngagement(
  projectId: string,
  ownerId: string,
): Promise<ProjectEngagementState> {
  const normalizedProjectId = requireProjectId(projectId);
  const { userId } = await auth();

  if (!userId) {
    return emptySignedOutState;
  }

  if (userId === ownerId) {
    return { ...emptySignedOutState, isOwner: true, isSignedIn: true };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const [likeResult, saveResult] = await Promise.all([
      supabase
        .from("project_likes")
        .select("project_id")
        .eq("project_id", normalizedProjectId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("project_saves")
        .select("project_id")
        .eq("project_id", normalizedProjectId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (likeResult.error) {
      throw likeResult.error;
    }

    if (saveResult.error) {
      throw saveResult.error;
    }

    return {
      isOwner: false,
      isSignedIn: true,
      liked: Boolean(likeResult.data),
      saved: Boolean(saveResult.data),
    };
  } catch (error) {
    throw new Error("Unable to load project interactions.", { cause: error });
  }
}

export async function setCurrentProjectLiked(
  projectId: string,
  liked: boolean,
): Promise<{ likeCount: number; liked: boolean }> {
  const normalizedProjectId = requireProjectId(projectId);
  const { userId } = await requireProfile();

  try {
    const supabase = await createServerSupabaseClient();

    if (liked) {
      const { error } = await supabase
        .from("project_likes")
        .insert({ project_id: normalizedProjectId } as never);

      if (error && !isUniqueViolation(error)) {
        throw error;
      }
    } else {
      const { error } = await supabase
        .from("project_likes")
        .delete()
        .eq("project_id", normalizedProjectId)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
    }

    const { data, error } = await supabase
      .from("projects")
      .select("like_count")
      .eq("id", normalizedProjectId)
      .eq("status", "published")
      .maybeSingle();

    if (error || !data) {
      throw error ?? new Error("Project unavailable.");
    }

    return { likeCount: data.like_count, liked };
  } catch (error) {
    throw new Error("Unable to update this project interaction.", {
      cause: error,
    });
  }
}

export async function setCurrentProjectSaved(
  projectId: string,
  saved: boolean,
): Promise<{ saved: boolean }> {
  const normalizedProjectId = requireProjectId(projectId);
  const { userId } = await requireProfile();

  try {
    const supabase = await createServerSupabaseClient();

    if (saved) {
      const { error } = await supabase
        .from("project_saves")
        .insert({ project_id: normalizedProjectId } as never);

      if (error && !isUniqueViolation(error)) {
        throw error;
      }
    } else {
      const { error } = await supabase
        .from("project_saves")
        .delete()
        .eq("project_id", normalizedProjectId)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
    }

    return { saved };
  } catch (error) {
    throw new Error("Unable to update this project interaction.", {
      cause: error,
    });
  }
}
