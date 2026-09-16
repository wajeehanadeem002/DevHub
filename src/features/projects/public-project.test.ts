import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

const { createServerSupabaseClientMock } = vi.hoisted(() => ({
  createServerSupabaseClientMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import {
  getPublicProject,
  getPublishedProjectsByOwner,
  type PublicProjectOwner,
} from "./public-project";

type ProviderResult = { data: unknown; error: unknown };
type ProviderResponses = Record<string, ProviderResult[]>;
type QueryCall = { args: unknown[]; method: string; table: string };

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const secondProjectId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const ownerId = "user_clerk_123";
const providerError = { message: "sensitive provider detail" };

const projectRow = {
  category_id: 2,
  demo_url: "https://taskflow.example",
  description: "Plan together.\nShip with focus.",
  id: projectId,
  like_count: 99,
  owner_id: ownerId,
  published_at: "2026-09-14T12:00:00.000Z",
  repository_url: "https://github.com/example/taskflow",
  search_document: "must-not-leak",
  status: "published",
  summary: "Plan and ship focused work.",
  title: "TaskFlow",
};

const ownerRow = {
  avatar_path: "user_clerk_123/avatar.webp",
  display_name: "Alex Morgan",
  headline: "Full Stack Developer",
  private_note: "must-not-leak",
  user_id: ownerId,
  username: "alexmorgan",
};

const categoryRow = { id: 2, name: "Developer Tool", slug: "developer-tool" };
const technologyRows = [
  { id: 2, name: "Next.js", slug: "next-js" },
  { id: 1, name: "React", slug: "react" },
];
const imageRows = [
  {
    alt_text: "TaskFlow planning board",
    height: 720,
    id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
    project_id: projectId,
    sort_order: 0,
    storage_path: "user_clerk_123/taskflow/cover.webp",
    width: 1280,
  },
  {
    alt_text: "TaskFlow review screen",
    height: 900,
    id: "876e5d2f-2666-4dfe-aec0-8ba9a7a0b192",
    project_id: projectId,
    sort_order: 1,
    storage_path: "user_clerk_123/taskflow/review.webp",
    width: 1440,
  },
];

function makeResult(data: unknown = null, error: unknown = null): ProviderResult {
  return { data, error };
}

function installProvider(responses: ProviderResponses) {
  const calls: QueryCall[] = [];
  const queues = Object.fromEntries(
    Object.entries(responses).map(([table, results]) => [table, [...results]]),
  ) as ProviderResponses;

  createServerSupabaseClientMock.mockResolvedValue({
    from(table: string) {
      const result = queues[table]?.shift();
      if (!result) {
        throw new Error(`Unexpected query for ${table}`);
      }

      const query = {
        eq(...args: unknown[]) {
          calls.push({ args, method: "eq", table });
          return query;
        },
        in(...args: unknown[]) {
          calls.push({ args, method: "in", table });
          return query;
        },
        is(...args: unknown[]) {
          calls.push({ args, method: "is", table });
          return query;
        },
        maybeSingle() {
          calls.push({ args: [], method: "maybeSingle", table });
          return Promise.resolve(result);
        },
        order(...args: unknown[]) {
          calls.push({ args, method: "order", table });
          return query;
        },
        select(...args: unknown[]) {
          calls.push({ args, method: "select", table });
          return query;
        },
        then<TResult1 = ProviderResult, TResult2 = never>(
          onfulfilled?: ((value: ProviderResult) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve(result).then(onfulfilled, onrejected);
        },
      };

      return query;
    },
  });

  return calls;
}

function publicProjectResponses(
  overrides: Partial<Record<
    | "projects"
    | "profiles"
    | "categories"
    | "project_technologies"
    | "technologies"
    | "project_images",
    ProviderResult
  >> = {},
): ProviderResponses {
  return {
    categories: [overrides.categories ?? makeResult(categoryRow)],
    profiles: [overrides.profiles ?? makeResult(ownerRow)],
    project_images: [overrides.project_images ?? makeResult(imageRows)],
    project_technologies: [
      overrides.project_technologies ??
        makeResult([{ technology_id: 1 }, { technology_id: 2 }]),
    ],
    projects: [overrides.projects ?? makeResult(projectRow)],
    technologies: [overrides.technologies ?? makeResult(technologyRows)],
  };
}

async function expectExactError(
  operation: Promise<unknown>,
  expectedMessage: string,
) {
  const error = await operation.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe(expectedMessage);
  expect((error as Error).message).not.toContain("sensitive provider detail");
}

describe("getPublicProject", () => {
  beforeEach(() => {
    createServerSupabaseClientMock.mockReset();
  });

  it("returns null for an invalid UUID before accessing the provider", async () => {
    await expect(getPublicProject("not-a-project-id")).resolves.toBeNull();
    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("masks a public project client-construction failure", async () => {
    createServerSupabaseClientMock.mockRejectedValue(
      new Error("sensitive provider detail"),
    );

    await expectExactError(
      getPublicProject(projectId),
      "Unable to load this project.",
    );
  });

  it("canonicalizes the UUID and assembles public fields plus the server owner ID with curated ordering", async () => {
    const calls = installProvider(publicProjectResponses());

    const result = await getPublicProject(`  ${projectId.toUpperCase()}  `);

    expect(result).toEqual(expect.objectContaining({
      like_count: 99,
      owner_id: "user_clerk_123",
    }));
    expect(result).toEqual({
      category: categoryRow,
      demo_url: "https://taskflow.example",
      description: "Plan together.\nShip with focus.",
      id: projectId,
      images: [
        {
          alt_text: "TaskFlow planning board",
          height: 720,
          id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
          sort_order: 0,
          storage_path: "user_clerk_123/taskflow/cover.webp",
          width: 1280,
        },
        {
          alt_text: "TaskFlow review screen",
          height: 900,
          id: "876e5d2f-2666-4dfe-aec0-8ba9a7a0b192",
          sort_order: 1,
          storage_path: "user_clerk_123/taskflow/review.webp",
          width: 1440,
        },
      ],
      like_count: 99,
      owner_id: "user_clerk_123",
      owner: {
        avatar_path: "user_clerk_123/avatar.webp",
        display_name: "Alex Morgan",
        headline: "Full Stack Developer",
        username: "alexmorgan",
      },
      published_at: "2026-09-14T12:00:00.000Z",
      repository_url: "https://github.com/example/taskflow",
      summary: "Plan and ship focused work.",
      technologies: technologyRows,
      title: "TaskFlow",
    });
    expect(result?.owner).not.toHaveProperty("user_id");
    expectTypeOf<PublicProjectOwner>().toEqualTypeOf<{
      avatar_path: string | null;
      display_name: string;
      headline: string | null;
      username: string;
    }>();

    expect(calls).toContainEqual({
      args: [expect.stringMatching(/\blike_count\b/)],
      method: "select",
      table: "projects",
    });
    expect(calls).toContainEqual({
      args: ["id", projectId],
      method: "eq",
      table: "projects",
    });
    expect(calls).toContainEqual({
      args: ["status", "published"],
      method: "eq",
      table: "projects",
    });
    expect(calls).toContainEqual({
      args: ["is_public", true],
      method: "eq",
      table: "profiles",
    });
    expect(calls).toContainEqual({
      args: ["deleted_at", null],
      method: "is",
      table: "profiles",
    });
    expect(calls).toContainEqual({
      args: ["sort_order", { ascending: true }],
      method: "order",
      table: "technologies",
    });
    expect(calls).toContainEqual({
      args: ["sort_order", { ascending: true }],
      method: "order",
      table: "project_images",
    });
  });

  it("returns null for a missing or draft project without querying its owner", async () => {
    const calls = installProvider({ projects: [makeResult(null)] });

    await expect(getPublicProject(projectId)).resolves.toBeNull();
    expect(calls.map((call) => call.table)).not.toContain("profiles");
  });

  it.each(["private", "deleted"])(
    "returns null for a %s owner without querying project relations",
    async () => {
      const calls = installProvider({
        profiles: [makeResult(null)],
        projects: [makeResult(projectRow)],
      });

      await expect(getPublicProject(projectId)).resolves.toBeNull();
      expect(calls.map((call) => call.table)).not.toContain("categories");
      expect(calls.map((call) => call.table)).not.toContain(
        "project_technologies",
      );
      expect(calls.map((call) => call.table)).not.toContain("project_images");
    },
  );

  it.each([
    ["project", "projects"],
    ["owner", "profiles"],
    ["category", "categories"],
    ["technology links", "project_technologies"],
    ["technologies", "technologies"],
    ["images", "project_images"],
  ] as const)("uses the exact safe error for a %s provider failure", async (_stage, table) => {
    const responses = publicProjectResponses({
      [table]: makeResult(null, providerError),
    });
    installProvider(responses);

    await expectExactError(
      getPublicProject(projectId),
      "Unable to load this project.",
    );
  });
});

describe("getPublishedProjectsByOwner", () => {
  beforeEach(() => {
    createServerSupabaseClientMock.mockReset();
  });

  function ownerListResponses(
    overrides: Partial<Record<
      | "profiles"
      | "projects"
      | "categories"
      | "project_technologies"
      | "technologies"
      | "project_images",
      ProviderResult
    >> = {},
  ): ProviderResponses {
    return {
      categories: [
        overrides.categories ??
          makeResult([
            categoryRow,
            { id: 3, name: "Productivity", slug: "productivity" },
          ]),
      ],
      profiles: [overrides.profiles ?? makeResult({ user_id: ownerId })],
      project_images: [
        overrides.project_images ??
          makeResult([
            ...imageRows,
            {
              alt_text: "SnippetBox editor",
              height: 800,
              id: "7ab23a58-1a59-4fa6-b566-c581deef8b3b",
              project_id: secondProjectId,
              sort_order: 0,
              storage_path: "user_clerk_123/snippet/cover.webp",
              width: 1200,
            },
          ]),
      ],
      project_technologies: [
        overrides.project_technologies ??
          makeResult([
            { project_id: projectId, technology_id: 1 },
            { project_id: projectId, technology_id: 2 },
            { project_id: secondProjectId, technology_id: 2 },
          ]),
      ],
      projects: [
        overrides.projects ??
          makeResult([
            projectRow,
            {
              category_id: 3,
              id: secondProjectId,
              owner_id: ownerId,
              published_at: "2026-09-13T12:00:00.000Z",
              secret: "must-not-leak",
              status: "published",
              summary: "Share small code examples.",
              title: "SnippetBox",
            },
          ]),
      ],
      technologies: [overrides.technologies ?? makeResult(technologyRows)],
    };
  }

  it("masks an owner-list client-construction failure", async () => {
    createServerSupabaseClientMock.mockRejectedValue(
      new Error("sensitive provider detail"),
    );

    await expectExactError(
      getPublishedProjectsByOwner(ownerId),
      "Unable to load published projects.",
    );
  });

  it("confirms the owner and assembles published summaries in provider order with first covers", async () => {
    const calls = installProvider(ownerListResponses());

    const projects = await getPublishedProjectsByOwner(`  ${ownerId}  `);

    expect(projects).toHaveLength(2);
    expect(projects[0]).toEqual({
      category: categoryRow,
      coverImage: {
        alt_text: "TaskFlow planning board",
        height: 720,
        id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
        sort_order: 0,
        storage_path: "user_clerk_123/taskflow/cover.webp",
        width: 1280,
      },
      id: projectId,
      published_at: "2026-09-14T12:00:00.000Z",
      summary: "Plan and ship focused work.",
      technologies: technologyRows,
      title: "TaskFlow",
    });
    expect(projects[1]).toMatchObject({
      category: { id: 3, name: "Productivity", slug: "productivity" },
      coverImage: { alt_text: "SnippetBox editor", sort_order: 0 },
      id: secondProjectId,
      technologies: [{ id: 2, name: "Next.js", slug: "next-js" }],
      title: "SnippetBox",
    });
    expect(calls).toContainEqual({
      args: ["user_id", ownerId],
      method: "eq",
      table: "profiles",
    });
    expect(calls).toContainEqual({
      args: ["is_public", true],
      method: "eq",
      table: "profiles",
    });
    expect(calls).toContainEqual({
      args: ["deleted_at", null],
      method: "is",
      table: "profiles",
    });
    expect(calls).toContainEqual({
      args: ["status", "published"],
      method: "eq",
      table: "projects",
    });
    expect(calls).toContainEqual({
      args: ["published_at", { ascending: false }],
      method: "order",
      table: "projects",
    });
  });

  it("returns an empty result for a private or deleted owner without querying projects", async () => {
    const calls = installProvider({ profiles: [makeResult(null)] });

    await expect(getPublishedProjectsByOwner(ownerId)).resolves.toEqual([]);
    expect(calls.map((call) => call.table)).not.toContain("projects");
  });

  it("short-circuits relation queries when the owner has no published projects", async () => {
    const calls = installProvider({
      profiles: [makeResult({ user_id: ownerId })],
      projects: [makeResult([])],
    });

    await expect(getPublishedProjectsByOwner(ownerId)).resolves.toEqual([]);
    expect(calls.map((call) => call.table)).toEqual([
      "profiles",
      "profiles",
      "profiles",
      "profiles",
      "profiles",
      "projects",
      "projects",
      "projects",
      "projects",
    ]);
  });

  it.each([
    ["owner", "profiles"],
    ["projects", "projects"],
    ["categories", "categories"],
    ["technology links", "project_technologies"],
    ["technologies", "technologies"],
    ["images", "project_images"],
  ] as const)("uses the exact safe error for a %s provider failure", async (_stage, table) => {
    installProvider(
      ownerListResponses({ [table]: makeResult(null, providerError) }),
    );

    await expectExactError(
      getPublishedProjectsByOwner(ownerId),
      "Unable to load published projects.",
    );
  });
});
