"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { parseAvatarFormData } from "./avatar-input";
import { removeCurrentAvatar, uploadCurrentAvatar } from "./avatar-storage";
import { getCurrentProfile, updateCurrentProfile } from "./current-profile";
import { parseProfileEditFormData } from "./profile-edit-input";
import type {
  AvatarActionState,
  ProfileEditActionState,
} from "./profile-edit-state";

function revalidateProfilePaths(username: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath(`/developers/${username}`);
}

export async function updateProfileAction(
  _previousState: ProfileEditActionState,
  formData: FormData,
): Promise<ProfileEditActionState> {
  const input = parseProfileEditFormData(formData);

  if (!input.success) {
    return {
      fieldErrors: input.fieldErrors,
      message: "Check the highlighted fields and try again.",
      status: "error",
    };
  }

  try {
    const { profile } = await getCurrentProfile();
    if (!profile) {
      throw new Error("The current developer profile does not exist.");
    }

    const result = await updateCurrentProfile(input.data);
    if (result === "username-taken") {
      return {
        fieldErrors: { username: ["That username is already taken."] },
        message: "Choose a different username and try again.",
        status: "error",
      };
    }

    revalidateProfilePaths(profile.username);
    if (profile.username !== input.data.username) {
      revalidatePath(`/developers/${input.data.username}`);
    }

    return {
      fieldErrors: {},
      message: "Your profile has been updated.",
      status: "success",
    };
  } catch {
    return {
      fieldErrors: {},
      message: "We couldn't update your profile. Please try again.",
      status: "error",
    };
  }
}

export async function uploadAvatarAction(
  _previousState: AvatarActionState,
  formData: FormData,
): Promise<AvatarActionState> {
  const input = parseAvatarFormData(formData);

  if (!input.success) {
    return {
      fieldError: input.fieldError,
      message: "Check the selected image and try again.",
      status: "error",
    };
  }

  try {
    const { profile } = await getCurrentProfile();
    if (!profile) {
      throw new Error("The current developer profile does not exist.");
    }

    const result = await uploadCurrentAvatar(
      input.data.file,
      input.data.extension,
    );
    revalidateProfilePaths(profile.username);

    return {
      message: result.cleanupWarning
        ? "Your avatar was updated. The previous file could not be cleaned up yet."
        : "Your avatar has been updated.",
      status: "success",
    };
  } catch {
    return {
      message: "We couldn't update your avatar. Please try again.",
      status: "error",
    };
  }
}

export async function removeAvatarAction(
  _previousState: AvatarActionState,
  _formData: FormData,
): Promise<AvatarActionState> {
  void _previousState;
  void _formData;

  try {
    const { profile } = await getCurrentProfile();
    if (!profile) {
      throw new Error("The current developer profile does not exist.");
    }

    const result = await removeCurrentAvatar();
    revalidateProfilePaths(profile.username);

    return {
      message: result.cleanupWarning
        ? "Your avatar was removed. The previous file could not be cleaned up yet."
        : "Your avatar has been removed.",
      status: "success",
    };
  } catch {
    return {
      message: "We couldn't remove your avatar. Please try again.",
      status: "error",
    };
  }
}
