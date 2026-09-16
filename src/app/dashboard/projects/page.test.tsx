import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  getAvatarPublicUrlMock,
  getCurrentProjectsMock,
  getProjectImagePublicUrlMock,
  requireProfileMock,
} = vi.hoisted(() => ({
  getAvatarPublicUrlMock: vi.fn(),
  getCurrentProjectsMock: vi.fn(),
  getProjectImagePublicUrlMock: vi.fn(),
  requireProfileMock: vi.fn(),
}));

vi.mock("@/lib/auth/require-profile", () => ({
  requireProfile: requireProfileMock,
}));
vi.mock("@/features/profile/avatar-storage", () => ({
  getAvatarPublicUrl: getAvatarPublicUrlMock,
}));
vi.mock("@/features/projects/project-data", () => ({
  getCurrentProjects: getCurrentProjectsMock,
}));
vi.mock("@/features/projects/project-image-storage", () => ({
  getProjectImagePublicUrl: getProjectImagePublicUrlMock,
}));

import DashboardProjectsPage from "./page";

const projectId = "550e8400-e29b-41d4-a716-446655440000";

describe("DashboardProjectsPage", () => {
  it("assembles the protected project workspace with resolved public images", async () => {
    requireProfileMock.mockResolvedValue({
      profile: {
        avatar_path: "user_clerk_123/avatar.jpg",
        display_name: "Alex Morgan",
        is_public: true,
        user_id: "user_clerk_123",
        username: "alexmorgan",
      },
      userId: "user_clerk_123",
    });
    getCurrentProjectsMock.mockResolvedValue([
      {
        category: { id: 2, name: "Developer Tool", slug: "developer-tool" },
        coverImage: {
          alt_text: "TaskFlow planning board",
          height: 720,
          id: "6d08fd19-2701-41ab-9b2a-c827ba66685b",
          sort_order: 0,
          storage_path: "user_clerk_123/project/cover.webp",
          width: 1280,
        },
        id: projectId,
        status: "published",
        summary: "Plan and ship focused work.",
        technologies: [{ id: 1, name: "React", slug: "react" }],
        title: "TaskFlow",
        updated_at: "2026-09-14T10:00:00.000Z",
      },
    ]);
    getAvatarPublicUrlMock.mockResolvedValue(
      "https://example.supabase.co/storage/v1/object/public/avatars/user/avatar.jpg",
    );
    getProjectImagePublicUrlMock.mockResolvedValue(
      "https://example.supabase.co/storage/v1/object/public/project-images/user/project/cover.webp",
    );

    render(await DashboardProjectsPage());

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Your projects" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Create project" })).toHaveAttribute(
      "href",
      "/dashboard/projects/new",
    );
    expect(
      within(screen.getByRole("article", { name: "TaskFlow" })).getByRole(
        "img",
        { name: "TaskFlow planning board" },
      ),
    ).toBeInTheDocument();
    expect(getProjectImagePublicUrlMock).toHaveBeenCalledWith(
      "user_clerk_123/project/cover.webp",
    );
  });

  it("renders the real accessible project empty state", async () => {
    requireProfileMock.mockResolvedValue({
      profile: {
        avatar_path: null,
        display_name: "Alex Morgan",
        is_public: false,
        user_id: "user_clerk_123",
        username: "alexmorgan",
      },
      userId: "user_clerk_123",
    });
    getCurrentProjectsMock.mockResolvedValue([]);
    getAvatarPublicUrlMock.mockResolvedValue(null);

    render(await DashboardProjectsPage());

    expect(
      screen.getByRole("heading", { name: "No projects yet" }),
    ).toBeInTheDocument();
    expect(getProjectImagePublicUrlMock).not.toHaveBeenCalled();
  });
});
