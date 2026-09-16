import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createCurrentProjectMock,
  createServerSupabaseClientMock,
  deleteCurrentProjectMock,
  getOwnedProjectMock,
  redirectMock,
  removeProjectImageMock,
  reorderProjectImagesMock,
  requireProfileMock,
  revalidatePathMock,
  storageFromMock,
  storageRemoveMock,
  untrustedProviderError,
  unstableRethrowMock,
  updateCurrentProjectMock,
  uploadProjectImageMock,
} = vi.hoisted(() => ({
  createCurrentProjectMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  deleteCurrentProjectMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  redirectMock: vi.fn(),
  removeProjectImageMock: vi.fn(),
  reorderProjectImagesMock: vi.fn(),
  requireProfileMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  storageFromMock: vi.fn(),
  storageRemoveMock: vi.fn(),
  untrustedProviderError: new Error(
    "provider detail: user_clerk_123/private/project-image.png",
  ),
  unstableRethrowMock: vi.fn(),
  updateCurrentProjectMock: vi.fn(),
  uploadProjectImageMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  unstable_rethrow: unstableRethrowMock,
}));
vi.mock("@/lib/auth/require-profile", () => ({
  requireProfile: requireProfileMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));
vi.mock("./project-data", () => ({
  createCurrentProject: createCurrentProjectMock,
  deleteCurrentProject: deleteCurrentProjectMock,
  getOwnedProject: getOwnedProjectMock,
  updateCurrentProject: updateCurrentProjectMock,
}));
vi.mock("./project-image-storage", () => ({
  removeProjectImage: removeProjectImageMock,
  reorderProjectImages: reorderProjectImagesMock,
  uploadProjectImage: uploadProjectImageMock,
}));

import {
  createProjectAction,
  deleteProjectAction,
  publishProjectAction,
  removeProjectImageAction,
  reorderProjectImagesAction,
  unpublishProjectAction,
  updateProjectAction,
  uploadProjectImageAction,
} from "./project-actions";
import {
  initialProjectActionState,
  initialProjectImageActionState,
  type ProjectActionState,
  type ProjectImageActionState,
} from "./project-action-state";

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const uppercaseProjectId = projectId.toUpperCase();
const imageId = "1f2df258-437d-40dc-b94a-6fb16452aa2c";
const secondImageId = "1cfa37a4-64a4-4619-b50f-1022d10d0949";
const redirectSentinel = new Error("NEXT_REDIRECT_CONTROL_FLOW");
const authRedirectSentinel = new Error("NEXT_AUTH_REDIRECT_CONTROL_FLOW");
const username = "alex-dev";

const ownedProject = {
  category_id: 2,
  demo_url: "https://taskflow.dev",
  description: "A focused task manager.",
  id: projectId,
  images: [],
  repository_url: "https://github.com/alex/taskflow",
  status: "draft" as const,
  summary: "Plan and ship focused work.",
  technologyIds: [1, 2],
  title: "TaskFlow",
};

const editableInput = {
  category_id: 2,
  demo_url: "https://taskflow.dev",
  description: "A focused task manager.",
  repository_url: "https://github.com/alex/taskflow",
  summary: "Plan and ship focused work.",
  technologyIds: [1, 2],
  title: "TaskFlow",
};

const allProjectPaths = [
  "/dashboard",
  "/dashboard/projects",
  "/",
  "/projects",
  `/dashboard/projects/${projectId}/edit`,
  `/projects/${projectId}`,
  `/developers/${username}`,
];

function validProjectFormData() {
  const formData = new FormData();
  formData.set("categoryId", "2");
  formData.set("demoUrl", "https://taskflow.dev");
  formData.set("description", "A focused task manager.");
  formData.set("repositoryUrl", "https://github.com/alex/taskflow");
  formData.set("summary", "Plan and ship focused work.");
  formData.append("technologyIds", "1");
  formData.append("technologyIds", "2");
  formData.set("title", "TaskFlow");
  return formData;
}

function validImageFormData() {
  const formData = new FormData();
  formData.set(
    "image",
    new File(["image bytes"], "dashboard.PNG", { type: "image/png" }),
  );
  formData.set("altText", "  TaskFlow dashboard  ");
  return formData;
}

function deleteFormData(submittedProjectId = projectId, confirmed = true) {
  const formData = new FormData();
  formData.set("projectId", submittedProjectId);
  if (confirmed) {
    formData.set("confirmDelete", "on");
  }
  return formData;
}

function reorderFormData(imageIds: readonly string[] = [imageId, secondImageId]) {
  const formData = new FormData();
  for (const id of imageIds) {
    formData.append("imageIds", id);
  }
  return formData;
}

function expectNoMutation() {
  expect(createCurrentProjectMock).not.toHaveBeenCalled();
  expect(deleteCurrentProjectMock).not.toHaveBeenCalled();
  expect(updateCurrentProjectMock).not.toHaveBeenCalled();
  expect(uploadProjectImageMock).not.toHaveBeenCalled();
  expect(removeProjectImageMock).not.toHaveBeenCalled();
  expect(reorderProjectImagesMock).not.toHaveBeenCalled();
}

function expectSafeState(
  state: ProjectActionState | ProjectImageActionState,
  expectedMessage: string,
) {
  expect(state.status).toBe("error");
  expect(state.message).toBe(expectedMessage);
  expect(JSON.stringify(state)).not.toContain(untrustedProviderError.message);
  expect(JSON.stringify(state)).not.toContain("private/project-image.png");
}

describe("project server actions", () => {
  beforeEach(() => {
    for (const mock of [
      createCurrentProjectMock,
      createServerSupabaseClientMock,
      deleteCurrentProjectMock,
      getOwnedProjectMock,
      redirectMock,
      removeProjectImageMock,
      reorderProjectImagesMock,
      requireProfileMock,
      revalidatePathMock,
      storageFromMock,
      storageRemoveMock,
      unstableRethrowMock,
      updateCurrentProjectMock,
      uploadProjectImageMock,
    ]) {
      mock.mockReset();
    }

    createCurrentProjectMock.mockResolvedValue(projectId);
    deleteCurrentProjectMock.mockResolvedValue([]);
    getOwnedProjectMock.mockResolvedValue(ownedProject);
    redirectMock.mockImplementation(() => {
      throw redirectSentinel;
    });
    removeProjectImageMock.mockResolvedValue({
      cleanupWarning: false,
      status: "removed",
    });
    reorderProjectImagesMock.mockResolvedValue("reordered");
    requireProfileMock.mockResolvedValue({
      profile: { username },
      userId: "user_clerk_123",
    });
    storageFromMock.mockReturnValue({ remove: storageRemoveMock });
    storageRemoveMock.mockResolvedValue({ error: null });
    createServerSupabaseClientMock.mockResolvedValue({
      storage: { from: storageFromMock },
    });
    updateCurrentProjectMock.mockResolvedValue("updated");
    uploadProjectImageMock.mockResolvedValue({
      imageId,
      storagePath: `user_clerk_123/${projectId}/image.png`,
    });
    unstableRethrowMock.mockImplementation((error: unknown) => {
      if (error === authRedirectSentinel) {
        throw error;
      }
    });
  });

  it("returns project field errors without authorizing or persisting invalid create input", async () => {
    const formData = validProjectFormData();
    formData.set("title", "   ");

    await expect(
      createProjectAction(initialProjectActionState, formData),
    ).resolves.toEqual({
      fieldErrors: { title: ["Enter a project title."] },
      message: "Check the highlighted project fields and try again.",
      status: "error",
    });
    expect(requireProfileMock).not.toHaveBeenCalled();
    expectNoMutation();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("creates a draft, revalidates the two workspaces, and lets redirect control flow escape the catch", async () => {
    await expect(
      createProjectAction(initialProjectActionState, validProjectFormData()),
    ).rejects.toBe(redirectSentinel);

    expect(createCurrentProjectMock).toHaveBeenCalledWith(editableInput);
    expect(revalidatePathMock.mock.calls).toEqual([
      ["/dashboard"],
      ["/dashboard/projects"],
    ]);
    expect(redirectMock).toHaveBeenCalledWith(
      `/dashboard/projects/${projectId}/edit?step=images`,
    );
    expect(createCurrentProjectMock.mock.invocationCallOrder[0]).toBeLessThan(
      revalidatePathMock.mock.invocationCallOrder[0] ?? 0,
    );
    expect(revalidatePathMock.mock.invocationCallOrder[1]).toBeLessThan(
      redirectMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("returns a stable create failure without revalidation or redirect", async () => {
    createCurrentProjectMock.mockRejectedValue(untrustedProviderError);

    const result = await createProjectAction(
      initialProjectActionState,
      validProjectFormData(),
    );

    expectSafeState(
      result,
      "We couldn't create the project. Please try again.",
    );
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("rethrows an authentication redirect raised by the create data boundary", async () => {
    createCurrentProjectMock.mockRejectedValue(authRedirectSentinel);

    await expect(
      createProjectAction(initialProjectActionState, validProjectFormData()),
    ).rejects.toBe(authRedirectSentinel);
    expect(unstableRethrowMock).toHaveBeenCalledWith(authRedirectSentinel);
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns project field errors without an owner lookup or persistence for an invalid update", async () => {
    const formData = validProjectFormData();
    formData.set("repositoryUrl", "javascript:alert(1)");

    await expect(
      updateProjectAction(projectId, initialProjectActionState, formData),
    ).resolves.toEqual({
      fieldErrors: {
        repositoryUrl: ["Enter a valid HTTP or HTTPS URL."],
      },
      message: "Check the highlighted project fields and try again.",
      status: "error",
    });
    expect(getOwnedProjectMock).not.toHaveBeenCalled();
    expectNoMutation();
  });

  it("preserves the freshly read owner status when updating editable fields", async () => {
    getOwnedProjectMock.mockResolvedValue({
      ...ownedProject,
      status: "published",
    });

    await expect(
      updateProjectAction(
        `  ${uppercaseProjectId}  `,
        initialProjectActionState,
        validProjectFormData(),
      ),
    ).resolves.toEqual({
      fieldErrors: {},
      message: "Project details saved.",
      status: "success",
    });
    expect(getOwnedProjectMock).toHaveBeenCalledWith(projectId);
    expect(updateCurrentProjectMock).toHaveBeenCalledWith(
      projectId,
      editableInput,
      "published",
    );
    expect(revalidatePathMock.mock.calls).toEqual(
      allProjectPaths.map((path) => [path]),
    );
    expect(getOwnedProjectMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateCurrentProjectMock.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it.each([
    ["publish", publishProjectAction, "published", "Project published."],
    [
      "unpublish",
      unpublishProjectAction,
      "draft",
      "Project moved back to drafts.",
    ],
  ] as const)(
    "%s re-reads ownership and maps to exactly the explicit status",
    async (_name, action, status, message) => {
      await expect(
        action(projectId, initialProjectActionState, new FormData()),
      ).resolves.toEqual({ fieldErrors: {}, message, status: "success" });
      expect(updateCurrentProjectMock).toHaveBeenCalledWith(
        projectId,
        editableInput,
        status,
      );
      expect(revalidatePathMock.mock.calls).toEqual(
        allProjectPaths.map((path) => [path]),
      );
      expect(getOwnedProjectMock.mock.invocationCallOrder[0]).toBeLessThan(
        updateCurrentProjectMock.mock.invocationCallOrder[0] ?? 0,
      );
    },
  );

  it.each([
    ["missing confirmation", deleteFormData(projectId, false)],
    ["a mismatched submitted ID", deleteFormData(secondImageId)],
    ["a non-string submitted ID", (() => {
      const formData = deleteFormData();
      formData.set("projectId", new File([projectId], "project-id.txt"));
      return formData;
    })()],
  ])("rejects deletion with %s before ownership or persistence", async (_name, formData) => {
    await expect(
      deleteProjectAction(projectId, initialProjectActionState, formData),
    ).resolves.toEqual({
      fieldErrors: {},
      message: "Confirm this exact project before deleting it.",
      status: "error",
    });
    expect(getOwnedProjectMock).not.toHaveBeenCalled();
    expectNoMutation();
  });

  it("deletes the database project first and cleans only its returned paths from project-images", async () => {
    const paths = [
      `user_clerk_123/${projectId}/cover.png`,
      `user_clerk_123/${projectId}/detail.webp`,
    ];
    deleteCurrentProjectMock.mockResolvedValue(paths);

    await expect(
      deleteProjectAction(
        ` ${uppercaseProjectId} `,
        initialProjectActionState,
        deleteFormData(),
      ),
    ).resolves.toEqual({
      fieldErrors: {},
      message: "Project deleted.",
      status: "success",
    });
    expect(getOwnedProjectMock).toHaveBeenCalledWith(projectId);
    expect(deleteCurrentProjectMock).toHaveBeenCalledWith(projectId);
    expect(storageFromMock).toHaveBeenCalledTimes(1);
    expect(storageFromMock).toHaveBeenCalledWith("project-images");
    expect(storageRemoveMock).toHaveBeenCalledWith(paths);
    expect(deleteCurrentProjectMock.mock.invocationCallOrder[0]).toBeLessThan(
      storageRemoveMock.mock.invocationCallOrder[0] ?? 0,
    );
    expect(revalidatePathMock.mock.calls).toEqual(
      allProjectPaths.map((path) => [path]),
    );
  });

  it.each([
    ["a returned Storage error", "result"],
    ["a thrown Storage error", "throw"],
    ["a client-construction error", "client"],
  ])(
    "keeps deletion successful and reports a safe cleanup warning after %s",
    async (_name, failureMode) => {
      deleteCurrentProjectMock.mockResolvedValue([
        `user_clerk_123/${projectId}/private.png`,
      ]);
      if (failureMode === "result") {
        storageRemoveMock.mockResolvedValue({ error: untrustedProviderError });
      } else if (failureMode === "throw") {
        storageRemoveMock.mockRejectedValue(untrustedProviderError);
      } else {
        createServerSupabaseClientMock.mockRejectedValue(untrustedProviderError);
      }

      const result = await deleteProjectAction(
        projectId,
        initialProjectActionState,
        deleteFormData(),
      );

      expect(result).toEqual({
        cleanupWarning:
          "Some project image files could not be cleaned up yet.",
        fieldErrors: {},
        message: "Project deleted.",
        status: "success",
      });
      expect(JSON.stringify(result)).not.toContain("private.png");
      expect(revalidatePathMock.mock.calls).toEqual(
        allProjectPaths.map((path) => [path]),
      );
    },
  );

  it("does not create a Storage client when deletion returns no image paths", async () => {
    await deleteProjectAction(
      projectId,
      initialProjectActionState,
      deleteFormData(),
    );

    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("validates upload form fields before ownership or Storage lifecycle work", async () => {
    await expect(
      uploadProjectImageAction(
        projectId,
        initialProjectImageActionState,
        new FormData(),
      ),
    ).resolves.toEqual({
      fieldErrors: {
        altText: ["Describe the project image."],
        image: ["Choose a project image to upload."],
      },
      message: "Check the highlighted image fields and try again.",
      status: "error",
    });
    expect(getOwnedProjectMock).not.toHaveBeenCalled();
    expect(uploadProjectImageMock).not.toHaveBeenCalled();
  });

  it("uploads only parsed image input after a normalized owner lookup", async () => {
    const formData = validImageFormData();
    const file = formData.get("image");

    await expect(
      uploadProjectImageAction(
        ` ${uppercaseProjectId} `,
        initialProjectImageActionState,
        formData,
      ),
    ).resolves.toEqual({
      fieldErrors: {},
      message: "Project image uploaded.",
      status: "success",
    });
    expect(getOwnedProjectMock).toHaveBeenCalledWith(projectId);
    expect(uploadProjectImageMock).toHaveBeenCalledWith(
      projectId,
      file,
      "png",
      "TaskFlow dashboard",
    );
    expect(revalidatePathMock.mock.calls).toEqual(
      allProjectPaths.map((path) => [path]),
    );
  });

  it("rejects an invalid bound image ID before ownership or removal", async () => {
    await expect(
      removeProjectImageAction(
        projectId,
        "not-an-image-id",
        initialProjectImageActionState,
        new FormData(),
      ),
    ).resolves.toEqual({
      fieldErrors: { image: ["Invalid image ID."] },
      message: "Check the highlighted image fields and try again.",
      status: "error",
    });
    expect(getOwnedProjectMock).not.toHaveBeenCalled();
    expect(removeProjectImageMock).not.toHaveBeenCalled();
  });

  it.each([
    ["no IDs", []],
    ["more than five IDs", [imageId, secondImageId, projectId, "6d08fd19-2701-41ab-9b2a-c827ba66685b", "df2a4aa9-50c2-4aec-8ac1-529957409810", "9cd7e9b1-22c0-4739-9015-604687b957e8"]],
  ])("rejects reorder with %s before ownership or lifecycle work", async (_name, imageIds) => {
    const result = await reorderProjectImagesAction(
      projectId,
      initialProjectImageActionState,
      reorderFormData(imageIds),
    );

    expect(result).toEqual({
      fieldErrors: { image: ["Choose between 1 and 5 project images."] },
      message: "Check the highlighted image fields and try again.",
      status: "error",
    });
    expect(getOwnedProjectMock).not.toHaveBeenCalled();
    expect(reorderProjectImagesMock).not.toHaveBeenCalled();
  });

  it.each([
    ["duplicate", [imageId, imageId], "Choose each project image only once."],
    ["malformed", ["not-an-image-id"], "Invalid image ID."],
  ])("rejects a %s reorder set before lifecycle work", async (_name, imageIds, message) => {
    const result = await reorderProjectImagesAction(
      projectId,
      initialProjectImageActionState,
      reorderFormData(imageIds),
    );

    expect(result).toEqual({
      fieldErrors: { image: [message] },
      message: "Check the highlighted image fields and try again.",
      status: "error",
    });
    expect(getOwnedProjectMock).not.toHaveBeenCalled();
    expect(reorderProjectImagesMock).not.toHaveBeenCalled();
  });

  it("normalizes every submitted reorder ID before lifecycle work", async () => {
    await expect(
      reorderProjectImagesAction(
        projectId,
        initialProjectImageActionState,
        reorderFormData([imageId.toUpperCase(), secondImageId]),
      ),
    ).resolves.toEqual({
      fieldErrors: {},
      message: "Project images reordered.",
      status: "success",
    });
    expect(reorderProjectImagesMock).toHaveBeenCalledWith(projectId, [
      imageId,
      secondImageId,
    ]);
  });

  it("reports image removal cleanup status without exposing paths or provider details", async () => {
    removeProjectImageMock.mockResolvedValue({
      cleanupWarning: true,
      status: "removed",
    });

    await expect(
      removeProjectImageAction(
        projectId,
        imageId.toUpperCase(),
        initialProjectImageActionState,
        new FormData(),
      ),
    ).resolves.toEqual({
      cleanupWarning:
        "The project image was removed, but its file could not be cleaned up yet.",
      fieldErrors: {},
      message: "Project image removed.",
      status: "success",
    });
    expect(removeProjectImageMock).toHaveBeenCalledWith(projectId, imageId);
    expect(revalidatePathMock.mock.calls).toEqual(
      allProjectPaths.map((path) => [path]),
    );
  });

  const existingActionCases: readonly [
    string,
    (boundProjectId: string) => Promise<ProjectActionState | ProjectImageActionState>,
    ReturnType<typeof vi.fn>,
  ][] = [
    [
      "update",
      (id) =>
        updateProjectAction(
          id,
          initialProjectActionState,
          validProjectFormData(),
        ),
      updateCurrentProjectMock,
    ],
    [
      "publish",
      (id) => publishProjectAction(id, initialProjectActionState, new FormData()),
      updateCurrentProjectMock,
    ],
    [
      "unpublish",
      (id) =>
        unpublishProjectAction(id, initialProjectActionState, new FormData()),
      updateCurrentProjectMock,
    ],
    [
      "delete",
      (id) =>
        deleteProjectAction(id, initialProjectActionState, deleteFormData()),
      deleteCurrentProjectMock,
    ],
    [
      "upload",
      (id) =>
        uploadProjectImageAction(
          id,
          initialProjectImageActionState,
          validImageFormData(),
        ),
      uploadProjectImageMock,
    ],
    [
      "remove",
      (id) =>
        removeProjectImageAction(
          id,
          imageId,
          initialProjectImageActionState,
          new FormData(),
        ),
      removeProjectImageMock,
    ],
    [
      "reorder",
      (id) =>
        reorderProjectImagesAction(
          id,
          initialProjectImageActionState,
          reorderFormData(),
        ),
      reorderProjectImagesMock,
    ],
  ];

  it.each(existingActionCases)(
    "%s rethrows an authentication redirect raised by getOwnedProject",
    async (_name, invoke) => {
      getOwnedProjectMock.mockRejectedValue(authRedirectSentinel);

      await expect(invoke(projectId)).rejects.toBe(authRedirectSentinel);
      expect(unstableRethrowMock).toHaveBeenCalledWith(authRedirectSentinel);
      expectNoMutation();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    },
  );

  it.each(existingActionCases)(
    "%s rethrows an onboarding redirect raised by direct requireProfile",
    async (_name, invoke) => {
      requireProfileMock.mockRejectedValue(authRedirectSentinel);

      await expect(invoke(projectId)).rejects.toBe(authRedirectSentinel);
      expect(unstableRethrowMock).toHaveBeenCalledWith(authRedirectSentinel);
      expectNoMutation();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    },
  );

  it.each(existingActionCases)(
    "%s rejects an invalid bound project ID before ownership or mutation",
    async (_name, invoke) => {
      const result = await invoke("not-a-project-id");

      expectSafeState(
        result,
        "We couldn't find a project you can manage.",
      );
      expect(getOwnedProjectMock).not.toHaveBeenCalled();
      expectNoMutation();
    },
  );

  it.each(existingActionCases)(
    "%s normalizes its bound project ID and re-reads ownership before mutation",
    async (_name, invoke, mutationMock) => {
      await invoke(` ${uppercaseProjectId} `);

      expect(getOwnedProjectMock).toHaveBeenCalledWith(projectId);
      expect(getOwnedProjectMock.mock.invocationCallOrder[0]).toBeLessThan(
        mutationMock.mock.invocationCallOrder[0] ?? 0,
      );
    },
  );

  it.each(existingActionCases)(
    "%s handles missing or not-owned projects with the same stable message",
    async (_name, invoke) => {
      getOwnedProjectMock.mockResolvedValue(null);

      const result = await invoke(projectId);

      expectSafeState(
        result,
        "We couldn't find a project you can manage.",
      );
      expectNoMutation();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    },
  );

  it.each(existingActionCases)(
    "%s masks an owner-provider failure and does not mutate",
    async (_name, invoke) => {
      getOwnedProjectMock.mockRejectedValue(untrustedProviderError);

      const result = await invoke(projectId);

      expect(result.status).toBe("error");
      expect(JSON.stringify(result)).not.toContain(untrustedProviderError.message);
      expectNoMutation();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      "update",
      () =>
        updateProjectAction(
          projectId,
          initialProjectActionState,
          validProjectFormData(),
        ),
      updateCurrentProjectMock,
      "We couldn't update the project. Please try again.",
    ],
    [
      "publish",
      () =>
        publishProjectAction(projectId, initialProjectActionState, new FormData()),
      updateCurrentProjectMock,
      "We couldn't publish the project. Please try again.",
    ],
    [
      "unpublish",
      () =>
        unpublishProjectAction(
          projectId,
          initialProjectActionState,
          new FormData(),
        ),
      updateCurrentProjectMock,
      "We couldn't unpublish the project. Please try again.",
    ],
    [
      "delete",
      () =>
        deleteProjectAction(
          projectId,
          initialProjectActionState,
          deleteFormData(),
        ),
      deleteCurrentProjectMock,
      "We couldn't delete the project. Please try again.",
    ],
    [
      "upload",
      () =>
        uploadProjectImageAction(
          projectId,
          initialProjectImageActionState,
          validImageFormData(),
        ),
      uploadProjectImageMock,
      "We couldn't upload the project image. Please try again.",
    ],
    [
      "remove",
      () =>
        removeProjectImageAction(
          projectId,
          imageId,
          initialProjectImageActionState,
          new FormData(),
        ),
      removeProjectImageMock,
      "We couldn't remove the project image. Please try again.",
    ],
    [
      "reorder",
      () =>
        reorderProjectImagesAction(
          projectId,
          initialProjectImageActionState,
          reorderFormData(),
        ),
      reorderProjectImagesMock,
      "We couldn't reorder project images. Please try again.",
    ],
  ] as const)(
    "%s masks mutation provider failures and skips revalidation",
    async (_name, invoke, mutationMock, message) => {
      mutationMock.mockRejectedValue(untrustedProviderError);

      const result = await invoke();

      expectSafeState(result, message);
      expect(revalidatePathMock).not.toHaveBeenCalled();
      expect(JSON.stringify(result)).not.toContain("user_clerk_123");
    },
  );
});
