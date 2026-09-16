import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabaseClientMock,
  profileEqMock,
  profileUpdateMock,
  removeMock,
  requireProfileMock,
  uploadMock,
} = vi.hoisted(() => ({
  createServerSupabaseClientMock: vi.fn(),
  profileEqMock: vi.fn(),
  profileUpdateMock: vi.fn(),
  removeMock: vi.fn(),
  requireProfileMock: vi.fn(),
  uploadMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-profile", () => ({ requireProfile: requireProfileMock }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import { removeCurrentAvatar, uploadCurrentAvatar } from "./avatar-storage";

describe("avatar storage lifecycle", () => {
  beforeEach(() => {
    createServerSupabaseClientMock.mockReset();
    profileEqMock.mockReset();
    profileUpdateMock.mockReset();
    removeMock.mockReset();
    requireProfileMock.mockReset();
    uploadMock.mockReset();

    requireProfileMock.mockResolvedValue({
      profile: { avatar_path: "user_clerk_123/old.jpg" },
      userId: "user_clerk_123",
    });
    profileUpdateMock.mockReturnValue({ eq: profileEqMock });
    createServerSupabaseClientMock.mockResolvedValue({
      from: () => ({ update: profileUpdateMock }),
      storage: { from: () => ({ remove: removeMock, upload: uploadMock }) },
    });
  });

  it("uploads a unique avatar, updates the profile, then removes the old object", async () => {
    uploadMock.mockResolvedValue({ error: null });
    profileEqMock.mockResolvedValue({ error: null });
    removeMock.mockResolvedValue({ error: null });
    const file = new File(["bytes"], "portrait.jpg", { type: "image/jpeg" });

    const result = await uploadCurrentAvatar(file, "jpg");

    expect(result).toEqual(expect.objectContaining({
      avatarPath: expect.stringMatching(/^user_clerk_123\/[0-9a-f-]+\.jpg$/),
      cleanupWarning: false,
      status: "updated",
    }));
    const avatarPath = result.status === "updated" ? result.avatarPath : "";
    expect(uploadMock).toHaveBeenCalledWith(avatarPath, file, {
      cacheControl: "31536000",
      contentType: "image/jpeg",
      upsert: false,
    });
    expect(profileUpdateMock).toHaveBeenCalledWith({ avatar_path: avatarPath });
    expect(removeMock).toHaveBeenCalledWith(["user_clerk_123/old.jpg"]);
    expect(profileEqMock.mock.invocationCallOrder[0]).toBeLessThan(
      removeMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("deletes the new object when saving its database reference fails", async () => {
    uploadMock.mockResolvedValue({ error: null });
    profileEqMock.mockResolvedValue({ error: { message: "update failed" } });
    removeMock.mockResolvedValue({ error: null });
    const file = new File(["bytes"], "portrait.png", { type: "image/png" });

    await expect(uploadCurrentAvatar(file, "png")).rejects.toThrow(
      "Unable to save your new avatar.",
    );
    expect(removeMock).toHaveBeenCalledWith([
      expect.stringMatching(/^user_clerk_123\/[0-9a-f-]+\.png$/),
    ]);
    expect(removeMock).not.toHaveBeenCalledWith(["user_clerk_123/old.jpg"]);
  });

  it("clears the profile reference before removing the active avatar", async () => {
    profileEqMock.mockResolvedValue({ error: null });
    removeMock.mockResolvedValue({ error: null });

    await expect(removeCurrentAvatar()).resolves.toEqual({
      cleanupWarning: false,
      status: "removed",
    });
    expect(profileUpdateMock).toHaveBeenCalledWith({ avatar_path: null });
    expect(removeMock).toHaveBeenCalledWith(["user_clerk_123/old.jpg"]);
    expect(profileEqMock.mock.invocationCallOrder[0]).toBeLessThan(
      removeMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("reports a safe warning when old-object cleanup fails after the update", async () => {
    profileEqMock.mockResolvedValue({ error: null });
    removeMock.mockResolvedValue({ error: { message: "cleanup failed" } });

    await expect(removeCurrentAvatar()).resolves.toEqual({
      cleanupWarning: true,
      status: "removed",
    });
  });
});
