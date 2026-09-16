import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabaseClientMock,
  fromMock,
  getPublicUrlMock,
  imageCountEqMock,
  imageCountSelectMock,
  ownerEqMock,
  ownershipMaybeSingleMock,
  projectIdEqMock,
  projectSelectMock,
  readProjectImageMetadataMock,
  removeMock,
  requireProfileMock,
  rpcMock,
  storageFromMock,
  uploadMock,
} = vi.hoisted(() => ({
  createServerSupabaseClientMock: vi.fn(),
  fromMock: vi.fn(),
  getPublicUrlMock: vi.fn(),
  imageCountEqMock: vi.fn(),
  imageCountSelectMock: vi.fn(),
  ownerEqMock: vi.fn(),
  ownershipMaybeSingleMock: vi.fn(),
  projectIdEqMock: vi.fn(),
  projectSelectMock: vi.fn(),
  readProjectImageMetadataMock: vi.fn(),
  removeMock: vi.fn(),
  requireProfileMock: vi.fn(),
  rpcMock: vi.fn(),
  storageFromMock: vi.fn(),
  uploadMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-profile", () => ({
  requireProfile: requireProfileMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));
vi.mock("./image-metadata", () => ({
  readProjectImageMetadata: readProjectImageMetadataMock,
}));

import {
  getProjectImagePublicUrl,
  removeProjectImage,
  reorderProjectImages,
  uploadProjectImage,
} from "./project-image-storage";

const ownerId = "user_clerk_123";
const projectId = "550e8400-e29b-41d4-a716-446655440000";
const imageId = "1f2df258-437d-40dc-b94a-6fb16452aa2c";
const secondImageId = "1cfa37a4-64a4-4619-b50f-1022d10d0949";
const generatedId = "6d08fd19-2701-41ab-9b2a-c827ba66685b";
const providerError = { code: "08006", message: "sensitive provider detail" };
const trustedMetadata = {
  byteSize: 123,
  height: 720,
  mimeType: "image/png" as const,
  width: 1280,
};

async function expectSafeError(
  operation: Promise<unknown>,
  expectedMessage: string,
) {
  const result = await operation.catch((error: unknown) => error);

  expect(result).toBeInstanceOf(Error);
  expect((result as Error).message).toBe(expectedMessage);
  expect((result as Error).message).not.toContain(providerError.message);
}

describe("project image storage lifecycle", () => {
  beforeEach(() => {
    for (const mock of [
      createServerSupabaseClientMock,
      fromMock,
      getPublicUrlMock,
      imageCountEqMock,
      imageCountSelectMock,
      ownerEqMock,
      ownershipMaybeSingleMock,
      projectIdEqMock,
      projectSelectMock,
      readProjectImageMetadataMock,
      removeMock,
      requireProfileMock,
      rpcMock,
      storageFromMock,
      uploadMock,
    ]) {
      mock.mockReset();
    }

    requireProfileMock.mockResolvedValue({
      profile: { user_id: ownerId },
      userId: ownerId,
    });
    projectSelectMock.mockReturnValue({ eq: projectIdEqMock });
    imageCountSelectMock.mockReturnValue({ eq: imageCountEqMock });
    projectIdEqMock.mockReturnValue({ eq: ownerEqMock });
    ownerEqMock.mockReturnValue({ maybeSingle: ownershipMaybeSingleMock });
    ownershipMaybeSingleMock.mockResolvedValue({
      data: { id: projectId },
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "projects") {
        return { select: projectSelectMock };
      }

      if (table === "project_images") {
        return { select: imageCountSelectMock };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    storageFromMock.mockReturnValue({
      getPublicUrl: getPublicUrlMock,
      remove: removeMock,
      upload: uploadMock,
    });
    createServerSupabaseClientMock.mockResolvedValue({
      from: fromMock,
      rpc: rpcMock,
      storage: { from: storageFromMock },
    });
    readProjectImageMetadataMock.mockResolvedValue(trustedMetadata);
    imageCountEqMock.mockResolvedValue({ count: 0, error: null });
    uploadMock.mockResolvedValue({ error: null });
    removeMock.mockResolvedValue({ error: null });
    rpcMock.mockResolvedValue({ data: imageId, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("authenticates, confirms ownership, uploads once, and persists only trusted metadata", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(generatedId);
    const file = new File(["untrusted bytes"], "client-name.png", {
      type: "image/png",
    });
    const storagePath = `${ownerId}/${projectId}/${generatedId}.png`;

    await expect(
      uploadProjectImage(
        " 550E8400-E29B-41D4-A716-446655440000 ",
        file,
        "png",
        "  TaskFlow board  ",
      ),
    ).resolves.toEqual({ imageId, storagePath });
    expect(requireProfileMock).toHaveBeenCalledTimes(1);
    expect(projectIdEqMock).toHaveBeenCalledWith("id", projectId);
    expect(ownerEqMock).toHaveBeenCalledWith("owner_id", ownerId);
    expect(imageCountSelectMock).toHaveBeenCalledWith("*", {
      count: "exact",
      head: true,
    });
    expect(imageCountEqMock).toHaveBeenCalledWith("project_id", projectId);
    expect(storageFromMock).toHaveBeenCalledWith("project-images");
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).toHaveBeenCalledWith(storagePath, file, {
      cacheControl: "31536000",
      contentType: "image/png",
      upsert: false,
    });
    expect(rpcMock).toHaveBeenCalledWith("add_current_project_image", {
      p_alt_text: "TaskFlow board",
      p_byte_size: 123,
      p_height: 720,
      p_mime_type: "image/png",
      p_project_id: projectId,
      p_storage_path: storagePath,
      p_width: 1280,
    });
    expect(ownershipMaybeSingleMock.mock.invocationCallOrder[0]).toBeLessThan(
      uploadMock.mock.invocationCallOrder[0] ?? 0,
    );
    expect(uploadMock.mock.invocationCallOrder[0]).toBeLessThan(
      rpcMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it.each([
    ["missing ownership", { data: null, error: null }],
    ["an ownership provider failure", { data: null, error: providerError }],
  ])("keeps %s behind the stable upload error", async (_name, ownership) => {
    ownershipMaybeSingleMock.mockResolvedValue(ownership);
    const file = new File(["bytes"], "project.png", { type: "image/png" });

    await expectSafeError(
      uploadProjectImage(projectId, file, "png", "Project image"),
      "Unable to upload the project image.",
    );
    expect(uploadMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("keeps a Storage upload failure behind the stable upload error", async () => {
    uploadMock.mockResolvedValue({ error: providerError });
    const file = new File(["bytes"], "project.png", { type: "image/png" });

    await expectSafeError(
      uploadProjectImage(projectId, file, "png", "Project image"),
      "Unable to upload the project image.",
    );
    expect(rpcMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it.each([
    ["blank", "   ", "Describe the project image."],
    [
      "over 200 characters",
      "x".repeat(201),
      "Keep image alt text to 200 characters or fewer.",
    ],
  ])(
    "rejects %s alt text before metadata or Storage work",
    async (_name, altText, message) => {
      const file = new File(["bytes"], "project.png", { type: "image/png" });

      await expect(
        uploadProjectImage(projectId, file, "png", altText),
      ).rejects.toThrow(message);
      expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
      expect(readProjectImageMetadataMock).not.toHaveBeenCalled();
      expect(storageFromMock).not.toHaveBeenCalled();
      expect(uploadMock).not.toHaveBeenCalled();
      expect(rpcMock).not.toHaveBeenCalled();
    },
  );

  it("rejects a sixth image before contacting Storage", async () => {
    imageCountEqMock.mockResolvedValue({ count: 5, error: null });
    const file = new File(["bytes"], "project.png", { type: "image/png" });

    await expect(
      uploadProjectImage(projectId, file, "png", "Project image"),
    ).rejects.toThrow("A project can have no more than five images.");
    expect(uploadMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a count provider failure", { count: null, error: providerError }],
    ["a missing count", { count: null, error: null }],
  ])("keeps %s behind the stable upload error", async (_name, countResult) => {
    imageCountEqMock.mockResolvedValue(countResult);
    const file = new File(["bytes"], "project.png", { type: "image/png" });

    await expectSafeError(
      uploadProjectImage(projectId, file, "png", "Project image"),
      "Unable to upload the project image.",
    );
    expect(uploadMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("masks an unexpected Supabase client-construction failure", async () => {
    createServerSupabaseClientMock.mockRejectedValue(providerError);
    const file = new File(["bytes"], "project.png", { type: "image/png" });

    await expectSafeError(
      uploadProjectImage(projectId, file, "png", "Project image"),
      "Unable to upload the project image.",
    );
    expect(fromMock).not.toHaveBeenCalled();
    expect(readProjectImageMetadataMock).not.toHaveBeenCalled();
    expect(storageFromMock).not.toHaveBeenCalled();
  });

  it("masks an unexpected metadata-reader failure before Storage", async () => {
    readProjectImageMetadataMock.mockRejectedValue(providerError);
    const file = new File(["bytes"], "project.png", { type: "image/png" });

    await expectSafeError(
      uploadProjectImage(projectId, file, "png", "Project image"),
      "Unable to upload the project image.",
    );
    expect(storageFromMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it.each([
    "Keep project images at 10 MB or smaller.",
    "The project image data is malformed.",
    "The file contents do not match the selected image type.",
    "Use a JPEG, PNG, or WebP image.",
    "Project image dimensions must be between 1 and 10,000 pixels.",
  ])("preserves the intentional metadata validation message: %s", async (message) => {
    readProjectImageMetadataMock.mockRejectedValue(new Error(message));
    const file = new File(["bytes"], "project.png", { type: "image/png" });

    await expect(
      uploadProjectImage(projectId, file, "png", "Project image"),
    ).rejects.toThrow(message);
    expect(storageFromMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it.each([
    ["an RPC failure", { data: null, error: providerError }],
    ["a missing RPC result", { data: null, error: null }],
  ])("removes the new object after %s without masking the primary error", async (_name, rpcResult) => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(generatedId);
    rpcMock.mockResolvedValue(rpcResult);
    removeMock.mockResolvedValue({ error: providerError });
    const file = new File(["bytes"], "project.png", { type: "image/png" });
    const storagePath = `${ownerId}/${projectId}/${generatedId}.png`;

    await expectSafeError(
      uploadProjectImage(projectId, file, "png", "Project image"),
      "Unable to save the project image.",
    );
    expect(removeMock).toHaveBeenCalledWith([storagePath]);
  });

  it("deletes image metadata before removing its returned Storage path", async () => {
    const storagePath = `${ownerId}/${projectId}/old.png`;
    rpcMock.mockResolvedValue({ data: storagePath, error: null });

    await expect(removeProjectImage(projectId, imageId)).resolves.toEqual({
      cleanupWarning: false,
      status: "removed",
    });
    expect(requireProfileMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("delete_current_project_image", {
      p_image_id: imageId,
      p_project_id: projectId,
    });
    expect(removeMock).toHaveBeenCalledWith([storagePath]);
    expect(rpcMock.mock.invocationCallOrder[0]).toBeLessThan(
      removeMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("returns a non-blocking warning when post-database Storage cleanup fails", async () => {
    rpcMock.mockResolvedValue({
      data: `${ownerId}/${projectId}/old.png`,
      error: null,
    });
    removeMock.mockResolvedValue({ error: providerError });

    await expect(removeProjectImage(projectId, imageId)).resolves.toEqual({
      cleanupWarning: true,
      status: "removed",
    });
  });

  it.each([
    ["an RPC failure", { data: null, error: providerError }],
    ["a missing returned path", { data: null, error: null }],
  ])("does not touch Storage after %s during removal", async (_name, rpcResult) => {
    rpcMock.mockResolvedValue(rpcResult);

    await expectSafeError(
      removeProjectImage(projectId, imageId),
      "Unable to remove the project image.",
    );
    expect(removeMock).not.toHaveBeenCalled();
  });

  it.each([
    ["not-a-project-id", imageId, "Invalid project ID."],
    [projectId, "not-an-image-id", "Invalid image ID."],
  ])("rejects invalid remove identifiers before the RPC", async (project, image, message) => {
    await expect(removeProjectImage(project, image)).rejects.toThrow(message);
    expect(requireProfileMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("sends the complete normalized image order through the owner-scoped RPC", async () => {
    rpcMock.mockResolvedValue({ data: undefined, error: null });

    await expect(
      reorderProjectImages(
        " 550E8400-E29B-41D4-A716-446655440000 ",
        [imageId.toUpperCase(), secondImageId],
      ),
    ).resolves.toBe("reordered");
    expect(requireProfileMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("reorder_current_project_images", {
      p_image_ids: [imageId, secondImageId],
      p_project_id: projectId,
    });
  });

  it.each([
    [[], "Choose between 1 and 5 project images."],
    [
      [imageId, secondImageId, generatedId, projectId, "df2a4aa9-50c2-4aec-8ac1-529957409810", "9cd7e9b1-22c0-4739-9015-604687b957e8"],
      "Choose between 1 and 5 project images.",
    ],
    [[imageId, imageId], "Choose each project image only once."],
    [["not-an-image-id"], "Invalid image ID."],
  ])("rejects an invalid reorder set before the RPC", async (imageIds, message) => {
    await expect(reorderProjectImages(projectId, imageIds)).rejects.toThrow(
      message,
    );
    expect(requireProfileMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("keeps reorder provider details behind a stable error", async () => {
    rpcMock.mockResolvedValue({ data: undefined, error: providerError });

    await expectSafeError(
      reorderProjectImages(projectId, [imageId]),
      "Unable to reorder project images.",
    );
  });

  it("returns null for absent paths without creating a provider client", async () => {
    await expect(getProjectImagePublicUrl(null)).resolves.toBeNull();
    await expect(getProjectImagePublicUrl("   ")).resolves.toBeNull();
    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("derives a public URL from only the project-images bucket", async () => {
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: "https://example.supabase.co/project-image.png" },
    });

    await expect(
      getProjectImagePublicUrl(`  ${ownerId}/${projectId}/cover.png  `),
    ).resolves.toBe("https://example.supabase.co/project-image.png");
    expect(storageFromMock).toHaveBeenCalledWith("project-images");
    expect(getPublicUrlMock).toHaveBeenCalledWith(
      `${ownerId}/${projectId}/cover.png`,
    );
    expect(requireProfileMock).not.toHaveBeenCalled();
  });
});
