import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentProfileMock,
  removeCurrentAvatarMock,
  revalidatePathMock,
  updateCurrentProfileMock,
  uploadCurrentAvatarMock,
} = vi.hoisted(() => ({
  getCurrentProfileMock: vi.fn(),
  removeCurrentAvatarMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  updateCurrentProfileMock: vi.fn(),
  uploadCurrentAvatarMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("./current-profile", () => ({
  getCurrentProfile: getCurrentProfileMock,
  updateCurrentProfile: updateCurrentProfileMock,
}));
vi.mock("./avatar-storage", () => ({
  removeCurrentAvatar: removeCurrentAvatarMock,
  uploadCurrentAvatar: uploadCurrentAvatarMock,
}));

import {
  removeAvatarAction,
  updateProfileAction,
  uploadAvatarAction,
} from "./profile-actions";
import {
  initialAvatarActionState,
  initialProfileEditActionState,
} from "./profile-edit-state";

function validProfileFormData() {
  const formData = new FormData();
  formData.set("username", "wajeehanadeem");
  formData.set("displayName", "Wajeeha Nadeem");
  formData.set("headline", "Full Stack Developer");
  formData.set("bio", "Building thoughtful web products.");
  formData.set("location", "Lahore, Pakistan");
  formData.set("websiteUrl", "https://example.com");
  formData.set("githubUrl", "https://github.com/example");
  formData.set("linkedinUrl", "https://linkedin.com/in/example");
  formData.set("isPublic", "on");
  formData.append("technologyIds", "1");
  return formData;
}

describe("profile management actions", () => {
  beforeEach(() => {
    getCurrentProfileMock.mockReset();
    removeCurrentAvatarMock.mockReset();
    revalidatePathMock.mockReset();
    updateCurrentProfileMock.mockReset();
    uploadCurrentAvatarMock.mockReset();
    getCurrentProfileMock.mockResolvedValue({
      profile: { username: "oldusername" },
      userId: "user_clerk_123",
    });
  });

  it("returns profile field errors without attempting persistence", async () => {
    const formData = validProfileFormData();
    formData.set("websiteUrl", "javascript:alert(1)");

    await expect(
      updateProfileAction(initialProfileEditActionState, formData),
    ).resolves.toEqual({
      fieldErrors: {
        websiteUrl: ["Enter a complete http:// or https:// URL."],
      },
      message: "Check the highlighted fields and try again.",
      status: "error",
    });
    expect(updateCurrentProfileMock).not.toHaveBeenCalled();
  });

  it("updates a profile and revalidates old, new, edit, and dashboard paths", async () => {
    updateCurrentProfileMock.mockResolvedValue("updated");

    await expect(
      updateProfileAction(initialProfileEditActionState, validProfileFormData()),
    ).resolves.toEqual({
      fieldErrors: {},
      message: "Your profile has been updated.",
      status: "success",
    });
    expect(revalidatePathMock.mock.calls).toEqual([
      ["/dashboard"],
      ["/dashboard/profile"],
      ["/developers/oldusername"],
      ["/developers/wajeehanadeem"],
    ]);
  });

  it("returns an actionable username conflict and hides unexpected failures", async () => {
    updateCurrentProfileMock.mockResolvedValueOnce("username-taken");

    await expect(
      updateProfileAction(initialProfileEditActionState, validProfileFormData()),
    ).resolves.toEqual({
      fieldErrors: { username: ["That username is already taken."] },
      message: "Choose a different username and try again.",
      status: "error",
    });

    updateCurrentProfileMock.mockRejectedValueOnce(new Error("provider detail"));
    await expect(
      updateProfileAction(initialProfileEditActionState, validProfileFormData()),
    ).resolves.toEqual({
      fieldErrors: {},
      message: "We couldn't update your profile. Please try again.",
      status: "error",
    });
  });

  it("rejects an invalid avatar before calling Storage", async () => {
    await expect(
      uploadAvatarAction(initialAvatarActionState, new FormData()),
    ).resolves.toEqual({
      fieldError: "Choose an avatar image to upload.",
      message: "Check the selected image and try again.",
      status: "error",
    });
    expect(uploadCurrentAvatarMock).not.toHaveBeenCalled();
  });

  it("uploads a valid avatar and reports non-blocking cleanup status", async () => {
    const formData = new FormData();
    const file = new File(["bytes"], "portrait.webp", { type: "image/webp" });
    formData.set("avatar", file);
    uploadCurrentAvatarMock.mockResolvedValue({
      avatarPath: "user_clerk_123/new.webp",
      cleanupWarning: true,
      status: "updated",
    });

    await expect(
      uploadAvatarAction(initialAvatarActionState, formData),
    ).resolves.toEqual({
      message:
        "Your avatar was updated. The previous file could not be cleaned up yet.",
      status: "success",
    });
    expect(uploadCurrentAvatarMock).toHaveBeenCalledWith(file, "webp");
    expect(revalidatePathMock).toHaveBeenCalledWith("/developers/oldusername");
  });

  it("removes an avatar and returns a safe retry message on failure", async () => {
    removeCurrentAvatarMock.mockResolvedValueOnce({
      cleanupWarning: false,
      status: "removed",
    });

    await expect(
      removeAvatarAction(initialAvatarActionState, new FormData()),
    ).resolves.toEqual({
      message: "Your avatar has been removed.",
      status: "success",
    });

    removeCurrentAvatarMock.mockRejectedValueOnce(new Error("provider detail"));
    await expect(
      removeAvatarAction(initialAvatarActionState, new FormData()),
    ).resolves.toEqual({
      message: "We couldn't remove your avatar. Please try again.",
      status: "error",
    });
  });
});
