import "server-only";

import { requireProfile } from "@/lib/auth/require-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

import { readProjectImageMetadata } from "./image-metadata";
import type { ProjectImageExtension } from "./project-image-input";
import { parseProjectId } from "./project-input";

const PROJECT_IMAGE_BUCKET = "project-images";
const PROJECT_IMAGE_VALIDATION_MESSAGES = new Set([
  "Keep project images at 10 MB or smaller.",
  "The project image data is malformed.",
  "The file contents do not match the selected image type.",
  "Use a JPEG, PNG, or WebP image.",
  "Project image dimensions must be between 1 and 10,000 pixels.",
]);

type AddProjectImageArgs =
  Database["public"]["Functions"]["add_current_project_image"]["Args"];
type DeleteProjectImageArgs =
  Database["public"]["Functions"]["delete_current_project_image"]["Args"];
type ReorderProjectImagesArgs =
  Database["public"]["Functions"]["reorder_current_project_images"]["Args"];

const mimeTypeByExtension = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const satisfies Record<ProjectImageExtension, string>;

function requireProjectId(value: string) {
  const result = parseProjectId(value);
  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}

function requireImageId(value: string) {
  const result = parseProjectId(value);
  if (!result.success) {
    throw new Error("Invalid image ID.");
  }

  return result.data;
}

function requireAltText(value: string) {
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  if (!normalizedValue) {
    throw new Error("Describe the project image.");
  }

  if (normalizedValue.length > 200) {
    throw new Error("Keep image alt text to 200 characters or fewer.");
  }

  return normalizedValue;
}

function isProjectImageValidationError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    PROJECT_IMAGE_VALIDATION_MESSAGES.has(error.message)
  );
}

export async function getProjectImagePublicUrl(path: string | null) {
  const normalizedPath = path?.trim();
  if (!normalizedPath) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  return supabase.storage.from(PROJECT_IMAGE_BUCKET).getPublicUrl(normalizedPath)
    .data.publicUrl;
}

export async function uploadProjectImage(
  projectId: string,
  file: File,
  extension: ProjectImageExtension,
  altText: string,
): Promise<{ imageId: string; storagePath: string }> {
  const { userId } = await requireProfile();
  const normalizedProjectId = requireProjectId(projectId);
  const normalizedAltText = requireAltText(altText);
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient();
  } catch (error) {
    throw new Error("Unable to upload the project image.", { cause: error });
  }

  let imageCount: number;
  try {
    const { data: ownedProject, error: ownershipError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", normalizedProjectId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (ownershipError || !ownedProject) {
      throw ownershipError ?? new Error("Project ownership was not confirmed.");
    }

    const { count, error: countError } = await supabase
      .from("project_images")
      .select("*", { count: "exact", head: true })
      .eq("project_id", normalizedProjectId);

    if (countError || count === null) {
      throw countError ?? new Error("Project image count was unavailable.");
    }

    imageCount = count;
  } catch (error) {
    throw new Error("Unable to upload the project image.", { cause: error });
  }

  if (imageCount >= 5) {
    throw new Error("A project can have no more than five images.");
  }

  let metadata: Awaited<ReturnType<typeof readProjectImageMetadata>>;
  try {
    metadata = await readProjectImageMetadata(file);
  } catch (error) {
    if (isProjectImageValidationError(error)) {
      throw error;
    }

    throw new Error("Unable to upload the project image.", { cause: error });
  }

  if (mimeTypeByExtension[extension] !== metadata.mimeType) {
    throw new Error("The project image extension does not match its contents.");
  }

  const storagePath = `${userId}/${normalizedProjectId}/${crypto.randomUUID()}.${extension}`;
  const bucket = supabase.storage.from(PROJECT_IMAGE_BUCKET);

  try {
    const { error } = await bucket.upload(storagePath, file, {
      cacheControl: "31536000",
      contentType: metadata.mimeType,
      upsert: false,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    throw new Error("Unable to upload the project image.", { cause: error });
  }

  const rpcArgs: AddProjectImageArgs = {
    p_alt_text: normalizedAltText,
    p_byte_size: metadata.byteSize,
    p_height: metadata.height,
    p_mime_type: metadata.mimeType,
    p_project_id: normalizedProjectId,
    p_storage_path: storagePath,
    p_width: metadata.width,
  };

  let imageId: string | null = null;
  let saveError: unknown = null;
  try {
    const result = await supabase.rpc("add_current_project_image", rpcArgs);
    imageId = result.data;
    saveError = result.error;
  } catch (error) {
    saveError = error;
  }

  if (saveError || !imageId) {
    try {
      await bucket.remove([storagePath]);
    } catch {
      // Best-effort compensation must preserve the database failure.
    }

    throw new Error("Unable to save the project image.", { cause: saveError });
  }

  return { imageId, storagePath };
}

export async function removeProjectImage(projectId: string, imageId: string) {
  await requireProfile();
  const normalizedProjectId = requireProjectId(projectId);
  const normalizedImageId = requireImageId(imageId);
  const supabase = await createServerSupabaseClient();
  const rpcArgs: DeleteProjectImageArgs = {
    p_image_id: normalizedImageId,
    p_project_id: normalizedProjectId,
  };

  let storagePath: string | null = null;
  let deleteError: unknown = null;
  try {
    const result = await supabase.rpc("delete_current_project_image", rpcArgs);
    storagePath = result.data;
    deleteError = result.error;
  } catch (error) {
    deleteError = error;
  }

  if (deleteError || !storagePath) {
    throw new Error("Unable to remove the project image.", {
      cause: deleteError,
    });
  }

  let cleanupWarning = false;
  try {
    const { error } = await supabase.storage
      .from(PROJECT_IMAGE_BUCKET)
      .remove([storagePath]);
    cleanupWarning = Boolean(error);
  } catch {
    cleanupWarning = true;
  }

  return { cleanupWarning, status: "removed" as const };
}

export async function reorderProjectImages(
  projectId: string,
  imageIds: string[],
): Promise<"reordered"> {
  await requireProfile();
  const normalizedProjectId = requireProjectId(projectId);

  if (imageIds.length < 1 || imageIds.length > 5) {
    throw new Error("Choose between 1 and 5 project images.");
  }

  const normalizedImageIds = imageIds.map(requireImageId);
  if (new Set(normalizedImageIds).size !== normalizedImageIds.length) {
    throw new Error("Choose each project image only once.");
  }

  const supabase = await createServerSupabaseClient();
  const rpcArgs: ReorderProjectImagesArgs = {
    p_image_ids: normalizedImageIds,
    p_project_id: normalizedProjectId,
  };

  try {
    const { error } = await supabase.rpc(
      "reorder_current_project_images",
      rpcArgs,
    );
    if (error) {
      throw error;
    }
  } catch (error) {
    throw new Error("Unable to reorder project images.", { cause: error });
  }

  return "reordered";
}
