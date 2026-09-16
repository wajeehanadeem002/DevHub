"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import {
  setCurrentProjectLiked,
  setCurrentProjectSaved,
} from "./project-engagement";
import { parseProjectId } from "./project-input";

export type LikeActionResult =
  | { likeCount: number; liked: boolean; status: "success" }
  | { message: string; status: "error" };

export type SaveActionResult =
  | { saved: boolean; status: "success" }
  | { message: string; status: "error" };

function revalidateEngagementPaths(projectId: string) {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard/saved");
}

export async function setProjectLikedAction(
  projectId: string,
  liked: boolean,
): Promise<LikeActionResult> {
  const parsed = parseProjectId(projectId);

  if (!parsed.success || typeof liked !== "boolean") {
    return {
      message: "We couldn't update this project's like. Please try again.",
      status: "error",
    } as const;
  }

  try {
    const result = await setCurrentProjectLiked(parsed.data, liked);
    revalidateEngagementPaths(parsed.data);
    return { ...result, status: "success" } as const;
  } catch (error) {
    unstable_rethrow(error);
    return {
      message: "We couldn't update this project's like. Please try again.",
      status: "error",
    } as const;
  }
}

export async function setProjectSavedAction(
  projectId: string,
  saved: boolean,
): Promise<SaveActionResult> {
  const parsed = parseProjectId(projectId);

  if (!parsed.success || typeof saved !== "boolean") {
    return {
      message:
        "We couldn't update this project's saved state. Please try again.",
      status: "error",
    } as const;
  }

  try {
    const result = await setCurrentProjectSaved(parsed.data, saved);
    revalidateEngagementPaths(parsed.data);
    return { ...result, status: "success" } as const;
  } catch (error) {
    unstable_rethrow(error);
    return {
      message:
        "We couldn't update this project's saved state. Please try again.",
      status: "error",
    } as const;
  }
}
