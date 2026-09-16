"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { requireProfile } from "@/lib/auth/require-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type {
  ProjectActionState,
  ProjectImageActionState,
} from "./project-action-state";
import {
  createCurrentProject,
  deleteCurrentProject,
  getOwnedProject,
  updateCurrentProject,
  type OwnedProject,
} from "./project-data";
import { parseProjectImageFormData } from "./project-image-input";
import {
  removeProjectImage,
  reorderProjectImages,
  uploadProjectImage,
} from "./project-image-storage";
import {
  parseProjectFormData,
  parseProjectId,
  type ProjectInput,
} from "./project-input";

const missingProjectMessage = "We couldn't find a project you can manage.";
const projectValidationMessage =
  "Check the highlighted project fields and try again.";
const imageValidationMessage =
  "Check the highlighted image fields and try again.";
const projectImageCleanupWarning =
  "The project image was removed, but its file could not be cleaned up yet.";
const projectCleanupWarning =
  "Some project image files could not be cleaned up yet.";

type OwnedProjectResult = {
  project: OwnedProject;
  projectId: string;
};

function projectError(message: string): ProjectActionState {
  return { fieldErrors: {}, message, status: "error" };
}

function imageError(message: string): ProjectImageActionState {
  return { fieldErrors: {}, message, status: "error" };
}

function invalidImageInput(message: string): ProjectImageActionState {
  return {
    fieldErrors: { image: [message] },
    message: imageValidationMessage,
    status: "error",
  };
}

function ownedProjectInput(project: OwnedProject): ProjectInput {
  return {
    category_id: project.category_id,
    demo_url: project.demo_url,
    description: project.description,
    repository_url: project.repository_url,
    summary: project.summary,
    technologyIds: project.technologyIds,
    title: project.title,
  };
}

async function readOwnedProject(
  untrustedProjectId: string,
): Promise<OwnedProjectResult | null> {
  const parsedProjectId = parseProjectId(untrustedProjectId);
  if (!parsedProjectId.success) {
    return null;
  }

  const project = await getOwnedProject(parsedProjectId.data);
  if (!project) {
    return null;
  }

  return { project, projectId: parsedProjectId.data };
}

function parseImageId(untrustedImageId: string) {
  const parsedImageId = parseProjectId(untrustedImageId);
  if (!parsedImageId.success) {
    return null;
  }

  return parsedImageId.data;
}

function parseImageOrder(formData: FormData) {
  const imageIds = formData.getAll("imageIds");
  if (imageIds.length < 1 || imageIds.length > 5) {
    return { error: "Choose between 1 and 5 project images." } as const;
  }

  const normalizedImageIds: string[] = [];
  for (const imageId of imageIds) {
    if (typeof imageId !== "string") {
      return { error: "Invalid image ID." } as const;
    }

    const normalizedImageId = parseImageId(imageId);
    if (!normalizedImageId) {
      return { error: "Invalid image ID." } as const;
    }

    normalizedImageIds.push(normalizedImageId);
  }

  if (new Set(normalizedImageIds).size !== normalizedImageIds.length) {
    return { error: "Choose each project image only once." } as const;
  }

  return { data: normalizedImageIds } as const;
}

function revalidateProjectPaths(projectId: string, username: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/dashboard/projects/${projectId}/edit`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/developers/${username}`);
}

async function removeDeletedProjectImages(paths: string[]) {
  if (paths.length === 0) {
    return false;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.storage
      .from("project-images")
      .remove(paths);
    return Boolean(error);
  } catch (error) {
    unstable_rethrow(error);
    return true;
  }
}

export async function createProjectAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  void _previousState;
  const input = parseProjectFormData(formData);
  if (!input.success) {
    return {
      fieldErrors: input.fieldErrors,
      message: projectValidationMessage,
      status: "error",
    };
  }

  let projectId: string;
  try {
    projectId = await createCurrentProject(input.data);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");
  } catch (error) {
    unstable_rethrow(error);
    return projectError("We couldn't create the project. Please try again.");
  }

  redirect(`/dashboard/projects/${projectId}/edit?step=images`);
}

export async function updateProjectAction(
  untrustedProjectId: string,
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  void _previousState;
  const input = parseProjectFormData(formData);
  if (!input.success) {
    return {
      fieldErrors: input.fieldErrors,
      message: projectValidationMessage,
      status: "error",
    };
  }

  try {
    const owned = await readOwnedProject(untrustedProjectId);
    if (!owned) {
      return projectError(missingProjectMessage);
    }

    const { profile } = await requireProfile();
    await updateCurrentProject(
      owned.projectId,
      input.data,
      owned.project.status,
    );
    revalidateProjectPaths(owned.projectId, profile.username);

    return {
      fieldErrors: {},
      message: "Project details saved.",
      status: "success",
    };
  } catch (error) {
    unstable_rethrow(error);
    return projectError("We couldn't update the project. Please try again.");
  }
}

async function changeProjectStatus(
  untrustedProjectId: string,
  status: "draft" | "published",
): Promise<ProjectActionState> {
  try {
    const owned = await readOwnedProject(untrustedProjectId);
    if (!owned) {
      return projectError(missingProjectMessage);
    }

    const { profile } = await requireProfile();
    await updateCurrentProject(
      owned.projectId,
      ownedProjectInput(owned.project),
      status,
    );
    revalidateProjectPaths(owned.projectId, profile.username);

    return {
      fieldErrors: {},
      message:
        status === "published"
          ? "Project published."
          : "Project moved back to drafts.",
      status: "success",
    };
  } catch (error) {
    unstable_rethrow(error);
    return projectError(
      status === "published"
        ? "We couldn't publish the project. Please try again."
        : "We couldn't unpublish the project. Please try again.",
    );
  }
}

export async function publishProjectAction(
  untrustedProjectId: string,
  _previousState: ProjectActionState,
  _formData: FormData,
): Promise<ProjectActionState> {
  void _previousState;
  void _formData;
  return changeProjectStatus(untrustedProjectId, "published");
}

export async function unpublishProjectAction(
  untrustedProjectId: string,
  _previousState: ProjectActionState,
  _formData: FormData,
): Promise<ProjectActionState> {
  void _previousState;
  void _formData;
  return changeProjectStatus(untrustedProjectId, "draft");
}

export async function deleteProjectAction(
  untrustedProjectId: string,
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  void _previousState;
  const parsedProjectId = parseProjectId(untrustedProjectId);
  if (!parsedProjectId.success) {
    return projectError(missingProjectMessage);
  }

  if (
    formData.get("projectId") !== parsedProjectId.data ||
    formData.get("confirmDelete") !== "on"
  ) {
    return projectError("Confirm this exact project before deleting it.");
  }

  try {
    const owned = await readOwnedProject(parsedProjectId.data);
    if (!owned) {
      return projectError(missingProjectMessage);
    }

    const { profile } = await requireProfile();
    const imagePaths = await deleteCurrentProject(owned.projectId);
    const cleanupWarning = await removeDeletedProjectImages(imagePaths);
    revalidateProjectPaths(owned.projectId, profile.username);

    return {
      ...(cleanupWarning ? { cleanupWarning: projectCleanupWarning } : {}),
      fieldErrors: {},
      message: "Project deleted.",
      status: "success",
    };
  } catch (error) {
    unstable_rethrow(error);
    return projectError("We couldn't delete the project. Please try again.");
  }
}

export async function uploadProjectImageAction(
  untrustedProjectId: string,
  _previousState: ProjectImageActionState,
  formData: FormData,
): Promise<ProjectImageActionState> {
  void _previousState;
  const input = parseProjectImageFormData(formData);
  if (!input.success) {
    return {
      fieldErrors: input.fieldErrors,
      message: imageValidationMessage,
      status: "error",
    };
  }

  try {
    const owned = await readOwnedProject(untrustedProjectId);
    if (!owned) {
      return imageError(missingProjectMessage);
    }

    const { profile } = await requireProfile();
    await uploadProjectImage(
      owned.projectId,
      input.data.file,
      input.data.extension,
      input.data.altText,
    );
    revalidateProjectPaths(owned.projectId, profile.username);

    return {
      fieldErrors: {},
      message: "Project image uploaded.",
      status: "success",
    };
  } catch (error) {
    unstable_rethrow(error);
    return imageError(
      "We couldn't upload the project image. Please try again.",
    );
  }
}

export async function removeProjectImageAction(
  untrustedProjectId: string,
  untrustedImageId: string,
  _previousState: ProjectImageActionState,
  _formData: FormData,
): Promise<ProjectImageActionState> {
  void _previousState;
  void _formData;
  const imageId = parseImageId(untrustedImageId);
  if (!imageId) {
    return invalidImageInput("Invalid image ID.");
  }

  try {
    const owned = await readOwnedProject(untrustedProjectId);
    if (!owned) {
      return imageError(missingProjectMessage);
    }

    const { profile } = await requireProfile();
    const result = await removeProjectImage(owned.projectId, imageId);
    revalidateProjectPaths(owned.projectId, profile.username);

    return {
      ...(result.cleanupWarning
        ? { cleanupWarning: projectImageCleanupWarning }
        : {}),
      fieldErrors: {},
      message: "Project image removed.",
      status: "success",
    };
  } catch (error) {
    unstable_rethrow(error);
    return imageError(
      "We couldn't remove the project image. Please try again.",
    );
  }
}

export async function reorderProjectImagesAction(
  untrustedProjectId: string,
  _previousState: ProjectImageActionState,
  formData: FormData,
): Promise<ProjectImageActionState> {
  void _previousState;
  const order = parseImageOrder(formData);
  if ("error" in order) {
    return invalidImageInput(order.error);
  }

  try {
    const owned = await readOwnedProject(untrustedProjectId);
    if (!owned) {
      return imageError(missingProjectMessage);
    }

    const { profile } = await requireProfile();
    await reorderProjectImages(owned.projectId, order.data);
    revalidateProjectPaths(owned.projectId, profile.username);

    return {
      fieldErrors: {},
      message: "Project images reordered.",
      status: "success",
    };
  } catch (error) {
    unstable_rethrow(error);
    return imageError(
      "We couldn't reorder project images. Please try again.",
    );
  }
}
