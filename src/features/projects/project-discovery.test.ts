import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabaseClientMock,
  createServerSupabasePublicClientMock,
  requireProfileMock,
} = vi.hoisted(() => ({
  createServerSupabaseClientMock: vi.fn(),
  createServerSupabasePublicClientMock: vi.fn(),
  requireProfileMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-profile", () => ({
  requireProfile: requireProfileMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
  createServerSupabasePublicClient: createServerSupabasePublicClientMock,
}));

import {
  getCurrentSavedProjects,
  getProjectDiscovery,
  getTrendingProjects,
} from "./project-discovery";

type ProviderResult = { count?: number | null; data: unknown; error: unknown };
type ProviderResponses = Record<string, ProviderResult[]>;
type QueryCall = { args: unknown[]; method: string; table: string };

const firstProjectId = "550e8400-e29b-41d4-a716-446655440000";
const secondProjectId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const categories = [
  { id: 2, name: "Developer Tools", slug: "developer-tools" },
  { id: 3, name: "Productivity", slug: "productivity" },
];
const technologies = [
  { id: 1, name: "React", slug: "react" },
  { id: 2, name: "Next.js", slug: "next-js" },
];
const projectRows = [
  {
    category_id: 2,
    id: firstProjectId,
    like_count: 42,
    owner_id: "user_alex",
    published_at: "2026-09-15T12:00:00.000Z",
    summary: "Plan and ship focused work.",
    title: "TaskFlow",
  },
  {
    category_id: 3,
    id: secondProjectId,
    like_count: 19,
    owner_id: "user_sam",
    published_at: "2026-09-14T12:00:00.000Z",
    summary: "Share useful code snippets.",
    title: "SnippetBox",
  },
];
const ownerRows = [
  {
    avatar_path: "user_alex/avatar.webp",
    display_name: "Alex Morgan",
    headline: "Full Stack Developer",
    user_id: "user_alex",
    username: "alexmorgan",
  },
  {
    avatar_path: null,
    display_name: "Sam Rivera",
    headline: null,
    user_id: "user_sam",
    username: "samrivera",
  },
];
const technologyLinks = [
  { project_id: firstProjectId, technology_id: 1 },
  { project_id: firstProjectId, technology_id: 2 },
  { project_id: secondProjectId, technology_id: 2 },
];
const imageRows = [
  {
    alt_text: "TaskFlow planning board",
    height: 720,
    id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
    project_id: firstProjectId,
    sort_order: 0,
    storage_path: "user_alex/taskflow/cover.webp",
    width: 1280,
  },
  {
    alt_text: "TaskFlow detail view",
    height: 720,
    id: "876e5d2f-2666-4dfe-aec0-8ba9a7a0b192",
    project_id: firstProjectId,
    sort_order: 1,
    storage_path: "user_alex/taskflow/detail.webp",
    width: 1280,
  },
];

function result(
  data: unknown = null,
  error: unknown = null,
  count?: number | null,
): ProviderResult {
  return { ...(count === undefined ? {} : { count }), data, error };
}

function installProvider(
  responses: ProviderResponses,
  clientMock = createServerSupabasePublicClientMock,
) {
  const calls: QueryCall[] = [];
  const queues = Object.fromEntries(
    Object.entries(responses).map(([table, values]) => [table, [...values]]),
  ) as ProviderResponses;

  clientMock.mockReturnValue({
    from(table: string) {
      calls.push({ args: [], method: "from", table });
      const response = queues[table]?.shift();
      if (!response) {
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
        order(...args: unknown[]) {
          calls.push({ args, method: "order", table });
          return query;
        },
        range(...args: unknown[]) {
          calls.push({ args, method: "range", table });
          return query;
        },
        select(...args: unknown[]) {
          calls.push({ args, method: "select", table });
          return query;
        },
        textSearch(...args: unknown[]) {
          calls.push({ args, method: "textSearch", table });
          return query;
        },
        then<TResult1 = ProviderResult, TResult2 = never>(
          onfulfilled?:
            | ((value: ProviderResult) => TResult1 | PromiseLike<TResult1>)
            | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve(response).then(onfulfilled, onrejected);
        },
      };

      return query;
    },
  });

  return calls;
}

function discoveryResponses(
  projectResult: ProviderResult = result(projectRows, null, 14),
): ProviderResponses {
  return {
    categories: [result(categories)],
    profiles: [result(ownerRows)],
    project_images: [result(imageRows)],
    project_technologies: [
      result([
        { project_id: firstProjectId },
        { project_id: secondProjectId },
      ]),
      result(technologyLinks),
    ],
    projects: [projectResult],
    technologies: [result(technologies)],
  };
}

const filters = {
  category: "developer-tools",
  page: 2,
  q: "code review",
  sort: "newest" as const,
  technology: "react",
};

describe("getProjectDiscovery", () => {
  beforeEach(() => {
    createServerSupabasePublicClientMock.mockReset();
  });

  it("filters published projects and assembles one page from bounded bulk queries", async () => {
    const calls = installProvider(discoveryResponses());

    const discovery = await getProjectDiscovery(filters);

    expect(discovery).toEqual({
      categories,
      filters,
      pageCount: 2,
      projects: [
        {
          category: categories[0],
          coverImage: {
            alt_text: "TaskFlow planning board",
            height: 720,
            id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
            sort_order: 0,
            storage_path: "user_alex/taskflow/cover.webp",
            width: 1280,
          },
          id: firstProjectId,
          like_count: 42,
          owner: {
            avatar_path: "user_alex/avatar.webp",
            display_name: "Alex Morgan",
            headline: "Full Stack Developer",
            username: "alexmorgan",
          },
          published_at: "2026-09-15T12:00:00.000Z",
          summary: "Plan and ship focused work.",
          technologies,
          title: "TaskFlow",
        },
        {
          category: categories[1],
          coverImage: null,
          id: secondProjectId,
          like_count: 19,
          owner: {
            avatar_path: null,
            display_name: "Sam Rivera",
            headline: null,
            username: "samrivera",
          },
          published_at: "2026-09-14T12:00:00.000Z",
          summary: "Share useful code snippets.",
          technologies: [technologies[1]],
          title: "SnippetBox",
        },
      ],
      technologies,
      totalCount: 14,
    });
    expect(createServerSupabasePublicClientMock).toHaveBeenCalledOnce();
    expect(calls).toContainEqual({
      args: ["status", "published"],
      method: "eq",
      table: "projects",
    });
    expect(calls).toContainEqual({
      args: ["category_id", 2],
      method: "eq",
      table: "projects",
    });
    expect(calls).toContainEqual({
      args: ["search_document", "code review", {
        config: "english",
        type: "websearch",
      }],
      method: "textSearch",
      table: "projects",
    });
    expect(calls).toContainEqual({
      args: [12, 23],
      method: "range",
      table: "projects",
    });
    expect(calls.filter((call) => call.method === "select")).toHaveLength(7);
  });

  it("uses deterministic popular ordering", async () => {
    const calls = installProvider({
      categories: [result(categories)],
      projects: [result([], null, 0)],
      technologies: [result(technologies)],
    });

    await getProjectDiscovery({
      category: null,
      page: 1,
      q: "",
      sort: "popular",
      technology: null,
    });

    expect(
      calls
        .filter((call) => call.table === "projects" && call.method === "order")
        .map((call) => call.args),
    ).toEqual([
      ["like_count", { ascending: false }],
      ["published_at", { ascending: false }],
      ["id", { ascending: true }],
    ]);
  });

  it("ignores unknown curated taxonomy slugs", async () => {
    const calls = installProvider({
      categories: [result(categories)],
      projects: [result([], null, 0)],
      technologies: [result(technologies)],
    });

    const discovery = await getProjectDiscovery({
      category: "unknown-category",
      page: 1,
      q: "",
      sort: "newest",
      technology: "unknown-technology",
    });

    expect(discovery.filters.category).toBeNull();
    expect(discovery.filters.technology).toBeNull();
    expect(
      calls.some(
        (call) =>
          call.table === "projects" &&
          call.method === "eq" &&
          call.args[0] === "category_id",
      ),
    ).toBe(false);
    expect(calls.filter((call) => call.table === "project_technologies"))
      .toHaveLength(0);
  });

  it("short-circuits when a curated technology has no matching projects", async () => {
    const calls = installProvider({
      categories: [result(categories)],
      project_technologies: [result([])],
      technologies: [result(technologies)],
    });

    const discovery = await getProjectDiscovery({
      category: null,
      page: 1,
      q: "",
      sort: "newest",
      technology: "react",
    });

    expect(discovery.projects).toEqual([]);
    expect(discovery.totalCount).toBe(0);
    expect(calls.some((call) => call.table === "projects")).toBe(false);
  });

  it("normalizes a page beyond the final result range", async () => {
    const calls = installProvider({
      categories: [result(categories)],
      profiles: [result([ownerRows[0]])],
      project_images: [result([imageRows[0]])],
      project_technologies: [result(technologyLinks.slice(0, 2))],
      projects: [
        result([], null, 13),
        result([projectRows[0]], null, 13),
      ],
      technologies: [result(technologies)],
    });

    const discovery = await getProjectDiscovery({
      category: null,
      page: 4,
      q: "",
      sort: "newest",
      technology: null,
    });

    expect(discovery.filters.page).toBe(2);
    expect(
      calls
        .filter((call) => call.table === "projects" && call.method === "range")
        .map((call) => call.args),
    ).toEqual([
      [36, 47],
      [12, 23],
    ]);
  });

  it("masks provider details with one stable discovery error", async () => {
    createServerSupabasePublicClientMock.mockImplementation(() => {
      throw new Error("sensitive provider detail");
    });

    const error = await getProjectDiscovery({
      category: null,
      page: 1,
      q: "",
      sort: "newest",
      technology: null,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Unable to load project discovery.");
    expect((error as Error).message).not.toContain("sensitive provider detail");
  });
});

describe("getTrendingProjects", () => {
  beforeEach(() => {
    createServerSupabasePublicClientMock.mockReset();
  });

  it("loads a bounded popular project set without full taxonomy option queries", async () => {
    const calls = installProvider({
      categories: [result(categories)],
      profiles: [result(ownerRows)],
      project_images: [result(imageRows)],
      project_technologies: [result(technologyLinks)],
      projects: [result(projectRows)],
      technologies: [result(technologies)],
    });

    const projects = await getTrendingProjects(4);

    expect(projects).toHaveLength(2);
    expect(calls).toContainEqual({
      args: ["status", "published"],
      method: "eq",
      table: "projects",
    });
    expect(calls).toContainEqual({
      args: [0, 3],
      method: "range",
      table: "projects",
    });
    expect(calls).toContainEqual({
      args: ["id", [2, 3]],
      method: "in",
      table: "categories",
    });
    expect(
      calls.filter(
        (call) => call.table === "categories" && call.method === "order",
      ),
    ).toHaveLength(0);
  });
});

describe("getCurrentSavedProjects", () => {
  const viewerId = "user_viewer";
  const saveRows = [
    { project_id: secondProjectId, created_at: "2026-09-15T12:00:00.000Z" },
    { project_id: firstProjectId, created_at: "2026-09-14T12:00:00.000Z" },
  ];

  function savedResponses(): ProviderResponses {
    return {
      categories: [result(categories)],
      profiles: [result(ownerRows)],
      project_images: [result(imageRows)],
      project_saves: [result(saveRows)],
      project_technologies: [result(technologyLinks)],
      projects: [result(projectRows)],
      technologies: [result(technologies)],
    };
  }

  beforeEach(() => {
    createServerSupabaseClientMock.mockReset();
    createServerSupabasePublicClientMock.mockReset();
    requireProfileMock.mockReset();
    requireProfileMock.mockResolvedValue({ userId: viewerId });
  });

  it("loads the viewer's published saves in save order despite provider project order", async () => {
    const calls = installProvider(savedResponses(), createServerSupabaseClientMock);

    const projects = await getCurrentSavedProjects();

    const saveCalls = calls
      .filter((call) => call.table === "project_saves")
      .map((call) => [call.method, ...call.args]);
    expect(saveCalls).toContainEqual(["select", "project_id, created_at"]);
    expect(saveCalls).toContainEqual(["eq", "user_id", viewerId]);
    expect(saveCalls).toContainEqual([
      "order", "created_at", { ascending: false },
    ]);
    expect(calls).toContainEqual({
      table: "projects", method: "eq", args: ["status", "published"],
    });
    expect(calls).toContainEqual({
      table: "projects", method: "in", args: ["id", [secondProjectId, firstProjectId]],
    });
    expect(projects.map((project) => project.id)).toEqual([
      secondProjectId, firstProjectId,
    ]);
    expect(projects[0]).toMatchObject({
      category: categories[1],
      owner: { username: "samrivera" },
      technologies: [technologies[1]],
    });
    expect(projects[1]?.coverImage).toMatchObject({
      storage_path: "user_alex/taskflow/cover.webp",
    });
    for (const project of projects) {
      expect(project).not.toHaveProperty("owner_id");
      expect(project.owner).not.toHaveProperty("user_id");
    }
  });

  it("omits missing projects and projects without a public undeleted owner", async () => {
    const responses = savedResponses();
    responses.project_saves = [result([
      ...saveRows,
      { project_id: "missing-project", created_at: "2026-09-13T12:00:00.000Z" },
    ])];
    responses.profiles = [result([ownerRows[0]])];
    const calls = installProvider(responses, createServerSupabaseClientMock);

    const projects = await getCurrentSavedProjects();

    expect(projects.map((project) => project.id)).toEqual([firstProjectId]);
    expect(calls).toContainEqual({
      table: "profiles", method: "eq", args: ["is_public", true],
    });
    expect(calls).toContainEqual({
      table: "profiles", method: "is", args: ["deleted_at", null],
    });
  });

  it.each([{ saves: [] }, { saves: null }])("skips the projects query when saves are $saves", async ({ saves }) => {
    const calls = installProvider({ project_saves: [result(saves)] }, createServerSupabaseClientMock);

    await expect(getCurrentSavedProjects()).resolves.toEqual([]);

    expect(calls.filter((call) => call.method === "from")).toEqual([
      { args: [], method: "from", table: "project_saves" },
    ]);
  });

  it.each([
    "project_saves", "projects", "profiles", "project_technologies",
    "project_images", "categories", "technologies",
  ])("masks %s provider failures", async (table) => {
    const responses = savedResponses();
    responses[table] = [result(null, new Error("sensitive provider detail"))];
    installProvider(responses, createServerSupabaseClientMock);

    await expect(getCurrentSavedProjects()).rejects.toThrow(
      /^Unable to load saved projects\.$/,
    );
  });

  it("does not query providers when authentication fails", async () => {
    requireProfileMock.mockRejectedValue(new Error("sensitive auth detail"));
    const calls = installProvider(savedResponses(), createServerSupabaseClientMock);

    await expect(getCurrentSavedProjects()).rejects.toThrow(
      /^Unable to load saved projects\.$/,
    );
    expect(calls).toEqual([]);
  });

  it("masks authenticated client creation failures", async () => {
    createServerSupabaseClientMock.mockRejectedValue(new Error("sensitive client detail"));

    await expect(getCurrentSavedProjects()).rejects.toThrow(
      /^Unable to load saved projects\.$/,
    );
  });
});
