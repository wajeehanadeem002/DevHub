import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  categoriesInMock,
  categoriesOrderMock,
  createServerSupabaseClientMock,
  currentCategoriesOrderMock,
  currentImagesOrderMock,
  currentProjectsOrderMock,
  currentTechnologiesOrderMock,
  fromMock,
  ownedImagesOrderMock,
  ownedProjectMaybeSingleMock,
  ownedTechnologiesOrderMock,
  projectImagesEqMock,
  projectImagesInMock,
  projectOwnerEqMock,
  projectTechnologiesEqMock,
  projectTechnologiesInMock,
  projectsEqMock,
  requireProfileMock,
  rpcMock,
  technologiesInMock,
  technologiesOrderMock,
} = vi.hoisted(() => ({
  categoriesInMock: vi.fn(),
  categoriesOrderMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  currentCategoriesOrderMock: vi.fn(),
  currentImagesOrderMock: vi.fn(),
  currentProjectsOrderMock: vi.fn(),
  currentTechnologiesOrderMock: vi.fn(),
  fromMock: vi.fn(),
  ownedImagesOrderMock: vi.fn(),
  ownedProjectMaybeSingleMock: vi.fn(),
  ownedTechnologiesOrderMock: vi.fn(),
  projectImagesEqMock: vi.fn(),
  projectImagesInMock: vi.fn(),
  projectOwnerEqMock: vi.fn(),
  projectTechnologiesEqMock: vi.fn(),
  projectTechnologiesInMock: vi.fn(),
  projectsEqMock: vi.fn(),
  requireProfileMock: vi.fn(),
  rpcMock: vi.fn(),
  technologiesInMock: vi.fn(),
  technologiesOrderMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-profile", () => ({
  requireProfile: requireProfileMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import {
  createCurrentProject,
  deleteCurrentProject,
  getCurrentProjects,
  getOwnedProject,
  getProjectTaxonomy,
  updateCurrentProject,
} from "./project-data";

const ownerId = "user_clerk_123";
const projectId = "550e8400-e29b-41d4-a716-446655440000";
const secondProjectId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const providerError = { code: "08006", message: "provider detail" };

const currentProjectRow = {
  category_id: 2,
  id: projectId,
  status: "published" as const,
  summary: "Plan and ship focused work.",
  title: "TaskFlow",
  updated_at: "2026-09-14T10:00:00.000Z",
};

const ownedProjectRow = {
  category_id: 2,
  demo_url: "https://taskflow.dev",
  description: "A focused task manager.",
  id: projectId,
  repository_url: "https://github.com/alex/taskflow",
  status: "draft" as const,
  summary: "Plan and ship focused work.",
  title: "TaskFlow",
};

const projectInput = {
  category_id: 2,
  demo_url: "https://taskflow.dev",
  description: "A focused task manager.",
  repository_url: "https://github.com/alex/taskflow",
  summary: "Plan and ship focused work.",
  technologyIds: [1, 2],
  title: "TaskFlow",
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

describe("owner project data boundary", () => {
  beforeEach(() => {
    for (const mock of [
      categoriesInMock,
      categoriesOrderMock,
      createServerSupabaseClientMock,
      currentCategoriesOrderMock,
      currentImagesOrderMock,
      currentProjectsOrderMock,
      currentTechnologiesOrderMock,
      fromMock,
      ownedImagesOrderMock,
      ownedProjectMaybeSingleMock,
      ownedTechnologiesOrderMock,
      projectImagesEqMock,
      projectImagesInMock,
      projectOwnerEqMock,
      projectTechnologiesEqMock,
      projectTechnologiesInMock,
      projectsEqMock,
      requireProfileMock,
      rpcMock,
      technologiesInMock,
      technologiesOrderMock,
    ]) {
      mock.mockReset();
    }

    requireProfileMock.mockResolvedValue({
      profile: { user_id: ownerId },
      userId: ownerId,
    });
    createServerSupabaseClientMock.mockResolvedValue({
      from: fromMock,
      rpc: rpcMock,
    });

    categoriesInMock.mockReturnValue({ order: currentCategoriesOrderMock });
    technologiesInMock.mockReturnValue({ order: currentTechnologiesOrderMock });
    projectImagesInMock.mockReturnValue({ order: currentImagesOrderMock });
    projectImagesEqMock.mockReturnValue({ order: ownedImagesOrderMock });
    projectTechnologiesEqMock.mockReturnValue({
      order: ownedTechnologiesOrderMock,
    });
    projectOwnerEqMock.mockReturnValue({
      maybeSingle: ownedProjectMaybeSingleMock,
    });
    projectsEqMock.mockImplementation((column: string) => {
      if (column === "owner_id") {
        return { order: currentProjectsOrderMock };
      }

      if (column === "id") {
        return { eq: projectOwnerEqMock };
      }

      throw new Error(`Unexpected project filter: ${column}`);
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "categories") {
        return {
          select: () => ({
            in: categoriesInMock,
            order: categoriesOrderMock,
          }),
        };
      }

      if (table === "technologies") {
        return {
          select: () => ({
            in: technologiesInMock,
            order: technologiesOrderMock,
          }),
        };
      }

      if (table === "projects") {
        return { select: () => ({ eq: projectsEqMock }) };
      }

      if (table === "project_technologies") {
        return {
          select: () => ({
            eq: projectTechnologiesEqMock,
            in: projectTechnologiesInMock,
          }),
        };
      }

      if (table === "project_images") {
        return {
          select: () => ({
            eq: projectImagesEqMock,
            in: projectImagesInMock,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    currentProjectsOrderMock.mockResolvedValue({
      data: [currentProjectRow],
      error: null,
    });
    currentCategoriesOrderMock.mockResolvedValue({
      data: [{ id: 2, name: "Developer Tool", slug: "developer-tool" }],
      error: null,
    });
    projectTechnologiesInMock.mockResolvedValue({
      data: [{ project_id: projectId, technology_id: 1 }],
      error: null,
    });
    currentTechnologiesOrderMock.mockResolvedValue({
      data: [{ id: 1, name: "React", slug: "react" }],
      error: null,
    });
    currentImagesOrderMock.mockResolvedValue({ data: [], error: null });
    ownedProjectMaybeSingleMock.mockResolvedValue({
      data: ownedProjectRow,
      error: null,
    });
    ownedTechnologiesOrderMock.mockResolvedValue({
      data: [{ technology_id: 1 }],
      error: null,
    });
    ownedImagesOrderMock.mockResolvedValue({ data: [], error: null });
  });

  it("returns both curated taxonomies in sort order", async () => {
    categoriesOrderMock.mockResolvedValue({
      data: [
        { id: 1, name: "Web Application", slug: "web-application" },
        { id: 2, name: "Developer Tool", slug: "developer-tool" },
      ],
      error: null,
    });
    technologiesOrderMock.mockResolvedValue({
      data: [
        { id: 1, name: "React", slug: "react" },
        { id: 2, name: "Next.js", slug: "next-js" },
      ],
      error: null,
    });

    await expect(getProjectTaxonomy()).resolves.toEqual({
      categories: [
        { id: 1, name: "Web Application", slug: "web-application" },
        { id: 2, name: "Developer Tool", slug: "developer-tool" },
      ],
      technologies: [
        { id: 1, name: "React", slug: "react" },
        { id: 2, name: "Next.js", slug: "next-js" },
      ],
    });
    expect(categoriesOrderMock).toHaveBeenCalledWith("sort_order", {
      ascending: true,
    });
    expect(technologiesOrderMock).toHaveBeenCalledWith("sort_order", {
      ascending: true,
    });
  });

  it.each([
    ["categories", categoriesOrderMock, technologiesOrderMock],
    ["technologies", technologiesOrderMock, categoriesOrderMock],
  ])(
    "keeps a %s provider failure behind the exact safe taxonomy error",
    async (_name, failingQuery, otherQuery) => {
      failingQuery.mockResolvedValue({ data: null, error: providerError });
      otherQuery.mockResolvedValue({ data: [], error: null });

      await expectSafeError(
        getProjectTaxonomy(),
        "Unable to load project taxonomy.",
      );
    },
  );

  it("returns owner-filtered dashboard projects with assembled card relations", async () => {
    currentProjectsOrderMock.mockResolvedValue({
      data: [
        {
          category_id: 2,
          id: projectId,
          status: "published",
          summary: "Plan and ship focused work.",
          title: "TaskFlow",
          updated_at: "2026-09-14T10:00:00.000Z",
        },
        {
          category_id: 1,
          id: secondProjectId,
          status: "draft",
          summary: "Share small code examples.",
          title: "SnippetBox",
          updated_at: "2026-09-13T10:00:00.000Z",
        },
      ],
      error: null,
    });
    currentCategoriesOrderMock.mockResolvedValue({
      data: [
        { id: 1, name: "Web Application", slug: "web-application" },
        { id: 2, name: "Developer Tool", slug: "developer-tool" },
      ],
      error: null,
    });
    currentTechnologiesOrderMock.mockResolvedValue({
      data: [
        { id: 1, name: "React", slug: "react" },
        { id: 2, name: "Next.js", slug: "next-js" },
      ],
      error: null,
    });
    projectTechnologiesInMock.mockResolvedValue({
      data: [
        { project_id: projectId, technology_id: 2 },
        { project_id: secondProjectId, technology_id: 2 },
        { project_id: projectId, technology_id: 1 },
      ],
      error: null,
    });
    currentImagesOrderMock.mockResolvedValue({
      data: [
        {
          alt_text: "SnippetBox editor",
          height: 720,
          id: "6d08fd19-2701-41ab-9b2a-c827ba66685b",
          project_id: secondProjectId,
          sort_order: 0,
          storage_path: `${ownerId}/${secondProjectId}/cover.webp`,
          width: 1280,
        },
        {
          alt_text: "TaskFlow board",
          height: 720,
          id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
          project_id: projectId,
          sort_order: 0,
          storage_path: `${ownerId}/${projectId}/cover.webp`,
          width: 1280,
        },
        {
          alt_text: "TaskFlow details",
          height: 720,
          id: "1cfa37a4-64a4-4619-b50f-1022d10d0949",
          project_id: projectId,
          sort_order: 1,
          storage_path: `${ownerId}/${projectId}/details.webp`,
          width: 1280,
        },
      ],
      error: null,
    });

    await expect(getCurrentProjects()).resolves.toEqual([
      {
        category: { id: 2, name: "Developer Tool", slug: "developer-tool" },
        coverImage: {
          alt_text: "TaskFlow board",
          height: 720,
          id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
          sort_order: 0,
          storage_path: `${ownerId}/${projectId}/cover.webp`,
          width: 1280,
        },
        id: projectId,
        status: "published",
        summary: "Plan and ship focused work.",
        technologies: [
          { id: 1, name: "React", slug: "react" },
          { id: 2, name: "Next.js", slug: "next-js" },
        ],
        title: "TaskFlow",
        updated_at: "2026-09-14T10:00:00.000Z",
      },
      {
        category: { id: 1, name: "Web Application", slug: "web-application" },
        coverImage: {
          alt_text: "SnippetBox editor",
          height: 720,
          id: "6d08fd19-2701-41ab-9b2a-c827ba66685b",
          sort_order: 0,
          storage_path: `${ownerId}/${secondProjectId}/cover.webp`,
          width: 1280,
        },
        id: secondProjectId,
        status: "draft",
        summary: "Share small code examples.",
        technologies: [
          { id: 2, name: "Next.js", slug: "next-js" },
        ],
        title: "SnippetBox",
        updated_at: "2026-09-13T10:00:00.000Z",
      },
    ]);
    expect(projectsEqMock).toHaveBeenCalledWith("owner_id", ownerId);
    expect(currentProjectsOrderMock).toHaveBeenCalledWith("updated_at", {
      ascending: false,
    });
  });

  it("returns an empty owner list without querying project relations", async () => {
    currentProjectsOrderMock.mockResolvedValue({ data: [], error: null });

    await expect(getCurrentProjects()).resolves.toEqual([]);
    expect(categoriesInMock).not.toHaveBeenCalled();
    expect(projectTechnologiesInMock).not.toHaveBeenCalled();
    expect(technologiesInMock).not.toHaveBeenCalled();
    expect(projectImagesInMock).not.toHaveBeenCalled();
  });

  it.each([
    [
      "projects",
      () =>
        currentProjectsOrderMock.mockResolvedValue({
          data: null,
          error: providerError,
        }),
    ],
    [
      "categories",
      () =>
        currentCategoriesOrderMock.mockResolvedValue({
          data: null,
          error: providerError,
        }),
    ],
    [
      "project technologies",
      () =>
        projectTechnologiesInMock.mockResolvedValue({
          data: null,
          error: providerError,
        }),
    ],
    [
      "technologies when links exist",
      () =>
        currentTechnologiesOrderMock.mockResolvedValue({
          data: null,
          error: providerError,
        }),
    ],
    [
      "project images",
      () =>
        currentImagesOrderMock.mockResolvedValue({
          data: null,
          error: providerError,
        }),
    ],
  ])(
    "keeps a %s list provider failure behind the exact safe error",
    async (_name, failProviderQuery) => {
      failProviderQuery();

      await expectSafeError(
        getCurrentProjects(),
        "Unable to load your projects.",
      );
    },
  );

  it("returns an owner-only editor model with ordered images", async () => {
    ownedProjectMaybeSingleMock.mockResolvedValue({
      data: {
        category_id: 2,
        demo_url: "https://taskflow.dev",
        description: "A focused task manager.",
        id: projectId,
        repository_url: "https://github.com/alex/taskflow",
        status: "draft",
        summary: "Plan and ship focused work.",
        title: "TaskFlow",
      },
      error: null,
    });
    ownedTechnologiesOrderMock.mockResolvedValue({
      data: [{ technology_id: 1 }, { technology_id: 2 }],
      error: null,
    });
    ownedImagesOrderMock.mockResolvedValue({
      data: [
        {
          alt_text: "TaskFlow board",
          height: 720,
          id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
          sort_order: 0,
          storage_path: `${ownerId}/${projectId}/cover.webp`,
          width: 1280,
        },
        {
          alt_text: "TaskFlow details",
          height: 720,
          id: "1cfa37a4-64a4-4619-b50f-1022d10d0949",
          sort_order: 1,
          storage_path: `${ownerId}/${projectId}/details.webp`,
          width: 1280,
        },
      ],
      error: null,
    });

    await expect(
      getOwnedProject(" 550E8400-E29B-41D4-A716-446655440000 "),
    ).resolves.toEqual({
      category_id: 2,
      demo_url: "https://taskflow.dev",
      description: "A focused task manager.",
      id: projectId,
      images: [
        {
          alt_text: "TaskFlow board",
          height: 720,
          id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
          sort_order: 0,
          storage_path: `${ownerId}/${projectId}/cover.webp`,
          width: 1280,
        },
        {
          alt_text: "TaskFlow details",
          height: 720,
          id: "1cfa37a4-64a4-4619-b50f-1022d10d0949",
          sort_order: 1,
          storage_path: `${ownerId}/${projectId}/details.webp`,
          width: 1280,
        },
      ],
      repository_url: "https://github.com/alex/taskflow",
      status: "draft",
      summary: "Plan and ship focused work.",
      technologyIds: [1, 2],
      title: "TaskFlow",
    });
    expect(projectsEqMock).toHaveBeenCalledWith("id", projectId);
    expect(projectOwnerEqMock).toHaveBeenCalledWith("owner_id", ownerId);
    expect(ownedImagesOrderMock).toHaveBeenCalledWith("sort_order", {
      ascending: true,
    });
  });

  it("rejects an invalid owner project ID before querying the provider", async () => {
    await expect(getOwnedProject("not-a-project-id")).rejects.toThrow(
      "Invalid project ID.",
    );
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns null for a missing or not-owned project without relation reads", async () => {
    ownedProjectMaybeSingleMock.mockResolvedValue({ data: null, error: null });

    await expect(getOwnedProject(projectId)).resolves.toBeNull();
    expect(projectTechnologiesEqMock).not.toHaveBeenCalled();
    expect(projectImagesEqMock).not.toHaveBeenCalled();
  });

  it("keeps the initial owned-project failure behind the exact safe error", async () => {
    ownedProjectMaybeSingleMock.mockResolvedValue({
      data: null,
      error: providerError,
    });

    await expectSafeError(
      getOwnedProject(projectId),
      "Unable to load this project.",
    );
  });

  it.each([
    ["technology", ownedTechnologiesOrderMock],
    ["image", ownedImagesOrderMock],
  ])(
    "keeps an owned-project %s relation failure behind the exact safe error",
    async (_name, failingQuery) => {
      failingQuery.mockResolvedValue({ data: null, error: providerError });

      await expectSafeError(
        getOwnedProject(projectId),
        "Unable to load this project.",
      );
    },
  );

  it("creates a draft through the atomic RPC with only seven editable values", async () => {
    rpcMock.mockResolvedValue({ data: projectId, error: null });

    await expect(createCurrentProject(projectInput)).resolves.toBe(projectId);
    expect(rpcMock).toHaveBeenCalledWith("create_current_project", {
      p_category_id: 2,
      p_demo_url: "https://taskflow.dev",
      p_description: "A focused task manager.",
      p_repository_url: "https://github.com/alex/taskflow",
      p_summary: "Plan and ship focused work.",
      p_technology_ids: [1, 2],
      p_title: "TaskFlow",
    });
    expect(requireProfileMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a create RPC failure behind the exact safe error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: providerError });

    await expectSafeError(
      createCurrentProject(projectInput),
      "Unable to create the project.",
    );
  });

  it("treats missing create RPC data as the exact safe error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await expectSafeError(
      createCurrentProject(projectInput),
      "Unable to create the project.",
    );
  });

  it("updates a validated owner project through the atomic RPC", async () => {
    rpcMock.mockResolvedValue({ data: undefined, error: null });

    await expect(
      updateCurrentProject(
        " 550E8400-E29B-41D4-A716-446655440000 ",
        projectInput,
        "published",
      ),
    ).resolves.toBe("updated");
    expect(rpcMock).toHaveBeenCalledWith("update_current_project", {
      p_category_id: 2,
      p_demo_url: "https://taskflow.dev",
      p_description: "A focused task manager.",
      p_project_id: projectId,
      p_repository_url: "https://github.com/alex/taskflow",
      p_status: "published",
      p_summary: "Plan and ship focused work.",
      p_technology_ids: [1, 2],
      p_title: "TaskFlow",
    });
    expect(requireProfileMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid runtime update status without calling the RPC", async () => {
    await expect(
      updateCurrentProject(projectId, projectInput, "archived" as "draft"),
    ).rejects.toThrow("Invalid project status.");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("keeps an update RPC failure behind the exact safe error", async () => {
    rpcMock.mockResolvedValue({ data: undefined, error: providerError });

    await expectSafeError(
      updateCurrentProject(projectId, projectInput, "draft"),
      "Unable to update the project.",
    );
  });

  it("deletes through the atomic RPC and normalizes a null path result", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await expect(deleteCurrentProject(projectId)).resolves.toEqual([]);
    expect(rpcMock).toHaveBeenCalledWith("delete_current_project", {
      p_project_id: projectId,
    });
    expect(requireProfileMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a delete RPC failure behind the exact safe error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: providerError });

    await expectSafeError(
      deleteCurrentProject(projectId),
      "Unable to delete the project.",
    );
  });
});
