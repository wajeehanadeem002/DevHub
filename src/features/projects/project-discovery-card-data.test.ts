import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DiscoverableProject } from "./project-discovery";

const { getAvatarPublicUrlMock, getProjectImagePublicUrlMock } = vi.hoisted(
  () => ({
    getAvatarPublicUrlMock: vi.fn(),
    getProjectImagePublicUrlMock: vi.fn(),
  }),
);

vi.mock("@/features/profile/avatar-storage", () => ({
  getAvatarPublicUrl: getAvatarPublicUrlMock,
}));

vi.mock("server-only", () => ({}));

vi.mock("./project-image-storage", () => ({
  getProjectImagePublicUrl: getProjectImagePublicUrlMock,
}));

import { resolveDiscoverableProjects } from "./project-discovery-card-data";

const project: DiscoverableProject = {
  category: { id: 1, name: "Web Applications", slug: "web-applications" },
  coverImage: {
    alt_text: "A project dashboard",
    height: 720,
    id: "image-1",
    sort_order: 0,
    storage_path: "owner/project/cover.webp",
    width: 1280,
  },
  id: "project-1",
  like_count: 42,
  owner: {
    avatar_path: "owner/avatar.webp",
    display_name: "Alex Morgan",
    headline: "Full Stack Developer",
    username: "alexmorgan",
  },
  published_at: "2026-09-15T10:00:00.000Z",
  summary: "A focused project summary.",
  technologies: [{ id: 1, name: "React", slug: "react" }],
  title: "TaskFlow",
};

describe("resolveDiscoverableProjects", () => {
  beforeEach(() => {
    getAvatarPublicUrlMock.mockReset();
    getProjectImagePublicUrlMock.mockReset();
  });

  it("resolves public media URLs and removes private storage paths", async () => {
    getAvatarPublicUrlMock.mockResolvedValue("https://cdn.test/avatar.webp");
    getProjectImagePublicUrlMock.mockResolvedValue(
      "https://cdn.test/cover.webp",
    );

    const resolved = (await resolveDiscoverableProjects([project]))[0]!;

    expect(getAvatarPublicUrlMock).toHaveBeenCalledWith("owner/avatar.webp");
    expect(getProjectImagePublicUrlMock).toHaveBeenCalledWith(
      "owner/project/cover.webp",
    );
    expect(resolved.owner).toEqual({
      avatarUrl: "https://cdn.test/avatar.webp",
      display_name: "Alex Morgan",
      username: "alexmorgan",
    });
    expect(resolved.coverImage).toEqual({
      alt_text: "A project dashboard",
      height: 720,
      id: "image-1",
      sort_order: 0,
      width: 1280,
    });
    expect(resolved.coverImageUrl).toBe("https://cdn.test/cover.webp");
    expect(resolved.coverImage).not.toHaveProperty("storage_path");
    expect(resolved.owner).not.toHaveProperty("avatar_path");
  });

  it("skips URL resolution when a project has no media paths", async () => {
    const resolved = (await resolveDiscoverableProjects([
      {
        ...project,
        coverImage: null,
        owner: { ...project.owner, avatar_path: null },
      },
    ]))[0]!;

    expect(getAvatarPublicUrlMock).not.toHaveBeenCalled();
    expect(getProjectImagePublicUrlMock).not.toHaveBeenCalled();
    expect(resolved.coverImage).toBeNull();
    expect(resolved.coverImageUrl).toBeNull();
    expect(resolved.owner.avatarUrl).toBeNull();
  });

  it("preserves input order across out-of-order media resolution and strips private fields", async () => {
    const secondProject = {
      ...project,
      coverImage: {
        ...project.coverImage!,
        id: "image-2",
        storage_path: "second-owner/second-project/cover.webp",
      },
      id: "project-2",
      owner_id: "private-second-owner",
      owner: {
        ...project.owner,
        avatar_path: "second-owner/avatar.webp",
        display_name: "Sam Rivera",
        user_id: "private-second-owner",
        username: "samrivera",
      },
      title: "SnippetBox",
    };
    let finishFirstAvatar!: (url: string) => void;
    const firstAvatar = new Promise<string>((resolve) => {
      finishFirstAvatar = resolve;
    });
    let finishSecondCover!: () => void;
    const secondCoverResolved = new Promise<void>((resolve) => {
      finishSecondCover = resolve;
    });
    getAvatarPublicUrlMock.mockImplementation((path: string) => {
      if (path === "owner/avatar.webp") return firstAvatar;
      if (path === "second-owner/avatar.webp") {
        return Promise.resolve("https://cdn.test/second-avatar.webp");
      }
      throw new Error(`Unexpected avatar path: ${path}`);
    });
    getProjectImagePublicUrlMock.mockImplementation((path: string) => {
      if (path === "owner/project/cover.webp") {
        return Promise.resolve("https://cdn.test/first-cover.webp");
      }
      if (path === "second-owner/second-project/cover.webp") {
        finishSecondCover();
        return Promise.resolve("https://cdn.test/second-cover.webp");
      }
      throw new Error(`Unexpected cover path: ${path}`);
    });

    const resolving = resolveDiscoverableProjects([project, secondProject]);
    await secondCoverResolved;
    finishFirstAvatar("https://cdn.test/first-avatar.webp");
    const resolved = await resolving;

    expect(resolved.map((item) => ({
      id: item.id,
      avatarUrl: item.owner.avatarUrl,
      coverImageUrl: item.coverImageUrl,
    }))).toEqual([
      {
        id: "project-1",
        avatarUrl: "https://cdn.test/first-avatar.webp",
        coverImageUrl: "https://cdn.test/first-cover.webp",
      },
      {
        id: "project-2",
        avatarUrl: "https://cdn.test/second-avatar.webp",
        coverImageUrl: "https://cdn.test/second-cover.webp",
      },
    ]);
    for (const item of resolved) {
      expect(item.coverImage).not.toHaveProperty("storage_path");
      expect(item.owner).not.toHaveProperty("avatar_path");
      expect(item.owner).not.toHaveProperty("user_id");
      expect(item).not.toHaveProperty("owner_id");
    }
    expect(JSON.stringify(resolved)).not.toContain("private-second-owner");
    expect(JSON.stringify(resolved)).not.toContain("owner/avatar.webp");
    expect(JSON.stringify(resolved)).not.toContain("project/cover.webp");
  });
});
