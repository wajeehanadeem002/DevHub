import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAvatarPublicUrlMock,
  getProjectEngagementMock,
  getProjectImagePublicUrlMock,
  getPublicProjectMock,
  notFoundMock,
  publicProjectViewPropsMock,
} = vi.hoisted(() => ({
  getAvatarPublicUrlMock: vi.fn(),
  getProjectEngagementMock: vi.fn(),
  getProjectImagePublicUrlMock: vi.fn(),
  getPublicProjectMock: vi.fn(),
  notFoundMock: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  publicProjectViewPropsMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/projects/project-engagement", () => ({
  getProjectEngagement: getProjectEngagementMock,
}));
vi.mock("@/features/projects/project-engagement-actions", () => ({
  setProjectLikedAction: vi.fn(),
  setProjectSavedAction: vi.fn(),
}));
vi.mock("@/features/profile/avatar-storage", () => ({
  getAvatarPublicUrl: getAvatarPublicUrlMock,
}));
vi.mock("@/features/projects/project-image-storage", () => ({
  getProjectImagePublicUrl: getProjectImagePublicUrlMock,
}));
vi.mock("@/features/projects/public-project", () => ({
  getPublicProject: getPublicProjectMock,
}));
vi.mock("@/features/projects/public-project-view", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/projects/public-project-view")
  >();
  return {
    ...actual,
    PublicProjectView: (
      props: Parameters<typeof actual.PublicProjectView>[0],
    ) => {
      publicProjectViewPropsMock(props);
      return actual.PublicProjectView(props);
    },
  };
});
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

import PublicProjectPage, { generateMetadata } from "./page";

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const engagement = {
  isOwner: false,
  isSignedIn: true,
  liked: true,
  saved: false,
};
const storagePaths = [
  "user_clerk_123/taskflow/cover.webp",
  "user_clerk_123/taskflow/review.webp",
];
const project = {
  category: { id: 2, name: "Developer Tool", slug: "developer-tool" },
  demo_url: "https://taskflow.example",
  description: "Plan together.\nShip with focus.",
  id: projectId,
  like_count: 99,
  owner_id: "user_clerk_123",
  images: storagePaths.map((storage_path, sort_order) => ({
    alt_text: sort_order === 0 ? "TaskFlow planning board" : "TaskFlow review screen",
    height: 720,
    id:
      sort_order === 0
        ? "1f2df258-437d-40dc-b94a-6fb16452aa2c"
        : "876e5d2f-2666-4dfe-aec0-8ba9a7a0b192",
    sort_order,
    storage_path,
    width: 1280,
  })),
  owner: {
    avatar_path: "user_clerk_123/avatar.webp",
    display_name: "Alex Morgan",
    headline: "Full Stack Developer",
    user_id: "user_clerk_123",
    username: "alexmorgan",
  },
  published_at: "2026-09-14T12:00:00.000Z",
  repository_url: "https://github.com/example/taskflow",
  summary: "Plan and ship focused work.",
  technologies: [{ id: 1, name: "React", slug: "react" }],
  title: "TaskFlow",
};

describe("PublicProjectPage", () => {
  beforeEach(() => {
    getAvatarPublicUrlMock.mockReset();
    getProjectEngagementMock.mockReset();
    getProjectImagePublicUrlMock.mockReset();
    getPublicProjectMock.mockReset();
    notFoundMock.mockClear();
    publicProjectViewPropsMock.mockClear();
    getPublicProjectMock.mockResolvedValue(project);
    getProjectEngagementMock.mockResolvedValue(engagement);
    getAvatarPublicUrlMock.mockResolvedValue(
      "https://example.supabase.co/storage/v1/object/public/avatars/user/avatar.webp",
    );
    getProjectImagePublicUrlMock.mockImplementation(async (path: string) =>
      path.endsWith("cover.webp")
        ? "https://example.supabase.co/storage/v1/object/public/project-images/cover.webp"
        : "https://example.supabase.co/storage/v1/object/public/project-images/review.webp",
    );
  });

  it("awaits params, resolves owner and image URLs on the server, and renders no raw paths", async () => {
    let paramsRead = false;
    const params = Promise.resolve({ id: projectId }).then((value) => {
      paramsRead = true;
      return value;
    });

    const page = await PublicProjectPage({ params });
    expect(getProjectEngagementMock).toHaveBeenCalledWith(
      projectId,
      project.owner_id,
    );
    expect(getProjectEngagementMock).toHaveBeenCalledOnce();
    render(page);

    expect(paramsRead).toBe(true);
    expect(getPublicProjectMock).toHaveBeenCalledWith(projectId);
    expect(getAvatarPublicUrlMock).toHaveBeenCalledWith(project.owner.avatar_path);
    expect(getProjectImagePublicUrlMock.mock.calls).toEqual(
      storagePaths.map((path) => [path]),
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "TaskFlow" }),
    ).toBeInTheDocument();
    for (const path of [...storagePaths, project.owner.avatar_path]) {
      expect(document.body.textContent).not.toContain(path);
    }
    const visualProject = publicProjectViewPropsMock.mock.calls[0]?.[0].project;
    expect(visualProject).not.toHaveProperty("owner_id");
    expect(JSON.stringify(visualProject)).not.toContain(project.owner_id);
    expect(publicProjectViewPropsMock).toHaveBeenCalledWith({
      engagement,
      project: expect.objectContaining({ like_count: 99 }),
    });
    expect(visualProject.owner).not.toHaveProperty("avatar_path");
    expect(visualProject.owner).not.toHaveProperty("user_id");
    expect(JSON.stringify(visualProject)).not.toContain(project.owner.user_id);
    for (const path of [...storagePaths, project.owner.avatar_path]) {
      expect(JSON.stringify(visualProject)).not.toContain(path);
    }
    for (const image of visualProject.images) {
      expect(image).not.toHaveProperty("storage_path");
    }
    expect(document.body.innerHTML).not.toContain(project.owner_id);
    expect(screen.getByRole("button", { name: "Like project" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Save project" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("99 likes")).toBeInTheDocument();
  });

  it("strips the server owner ID before returning visual props", async () => {
    const page = await PublicProjectPage({
      params: Promise.resolve({ id: projectId }),
    });

    expect(page.props.project).not.toHaveProperty("owner_id");
    expect(JSON.stringify(page.props)).not.toContain(project.owner_id);
  });

  it("uses notFound for every null public result without resolving storage URLs", async () => {
    getPublicProjectMock.mockResolvedValue(null);

    await expect(
      PublicProjectPage({ params: Promise.resolve({ id: "invalid-or-missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledOnce();
    expect(getAvatarPublicUrlMock).not.toHaveBeenCalled();
    expect(getProjectImagePublicUrlMock).not.toHaveBeenCalled();
    expect(getProjectEngagementMock).not.toHaveBeenCalled();
  });

  it("generates project-aware metadata and a non-leaking generic fallback", async () => {
    getPublicProjectMock.mockResolvedValueOnce(project).mockResolvedValueOnce(null);

    await expect(
      generateMetadata({ params: Promise.resolve({ id: projectId }) }),
    ).resolves.toEqual({
      description: "Plan and ship focused work.",
      title: "TaskFlow",
    });
    await expect(
      generateMetadata({ params: Promise.resolve({ id: "invalid-or-missing" }) }),
    ).resolves.toEqual({
      description: "Explore published developer work on DevHub.",
      title: "Project",
    });
  });
});
