import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAvatarPublicUrlMock,
  getProjectImagePublicUrlMock,
  getPublishedProjectsByOwnerMock,
  getPublicProfileMock,
  notFoundMock,
  publicProfileViewPropsMock,
} = vi.hoisted(
  () => ({
    getAvatarPublicUrlMock: vi.fn(),
    getProjectImagePublicUrlMock: vi.fn(),
    getPublishedProjectsByOwnerMock: vi.fn(),
    getPublicProfileMock: vi.fn(),
    notFoundMock: vi.fn((): never => {
      throw new Error("not-found");
    }),
    publicProfileViewPropsMock: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));
vi.mock("@/features/profile/avatar-storage", () => ({
  getAvatarPublicUrl: getAvatarPublicUrlMock,
}));
vi.mock("@/features/profile/public-profile", () => ({
  getPublicProfile: getPublicProfileMock,
}));
vi.mock("@/features/projects/project-image-storage", () => ({
  getProjectImagePublicUrl: getProjectImagePublicUrlMock,
}));
vi.mock("@/features/projects/public-project", () => ({
  getPublishedProjectsByOwner: getPublishedProjectsByOwnerMock,
}));
vi.mock("@/features/profile/public-profile-view", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/profile/public-profile-view")
  >();
  return {
    ...actual,
    PublicProfileView: (
      props: Parameters<typeof actual.PublicProfileView>[0],
    ) => {
      publicProfileViewPropsMock(props);
      return actual.PublicProfileView(props);
    },
  };
});
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

import DeveloperProfilePage, { generateMetadata } from "./page";

const profile = {
  avatar_path: "user_clerk_123/avatar.webp",
  bio: "Building reliable web products.",
  display_name: "Wajeeha Nadeem",
  github_url: null,
  headline: "Full Stack Developer",
  linkedin_url: null,
  location: "Lahore, Pakistan",
  technologies: [],
  user_id: "user_clerk_123",
  username: "wajeehanadeem",
  website_url: null,
};

const project = {
  category: { id: 2, name: "Developer Tool", slug: "developer-tool" },
  coverImage: {
    alt_text: "TaskFlow planning board",
    height: 720,
    id: "1f2df258-437d-40dc-b94a-6fb16452aa2c",
    sort_order: 0,
    storage_path: "user_clerk_123/taskflow/cover.webp",
    width: 1280,
  },
  id: "550e8400-e29b-41d4-a716-446655440000",
  published_at: "2026-09-14T12:00:00.000Z",
  summary: "Plan and ship focused work.",
  technologies: [{ id: 1, name: "React", slug: "react" }],
  title: "TaskFlow",
};

describe("DeveloperProfilePage", () => {
  beforeEach(() => {
    getAvatarPublicUrlMock.mockReset();
    getProjectImagePublicUrlMock.mockReset();
    getPublishedProjectsByOwnerMock.mockReset();
    getPublicProfileMock.mockReset();
    notFoundMock.mockClear();
    publicProfileViewPropsMock.mockClear();
    getPublishedProjectsByOwnerMock.mockResolvedValue([]);
  });

  it("awaits the username and renders the public profile with resolved published projects", async () => {
    getPublicProfileMock.mockResolvedValue(profile);
    getPublishedProjectsByOwnerMock.mockResolvedValue([project]);
    getAvatarPublicUrlMock.mockResolvedValue(
      "https://example.supabase.co/storage/v1/object/public/avatars/user/avatar.webp",
    );
    getProjectImagePublicUrlMock.mockResolvedValue(
      "https://example.supabase.co/storage/v1/object/public/project-images/user/project/cover.webp",
    );

    render(
      await DeveloperProfilePage({
        params: Promise.resolve({ username: "WajeehaNadeem" }),
      }),
    );

    expect(getPublicProfileMock).toHaveBeenCalledWith("WajeehaNadeem");
    expect(
      screen.getByRole("heading", { level: 1, name: "Wajeeha Nadeem" }),
    ).toBeInTheDocument();
    expect(getPublishedProjectsByOwnerMock).toHaveBeenCalledWith(
      profile.user_id,
    );
    expect(getProjectImagePublicUrlMock).toHaveBeenCalledWith(
      project.coverImage.storage_path,
    );
    expect(screen.getByRole("link", { name: "View TaskFlow" })).toHaveAttribute(
      "href",
      `/projects/${project.id}`,
    );
    expect(document.body.textContent).not.toContain(profile.avatar_path);
    expect(document.body.textContent).not.toContain(
      project.coverImage.storage_path,
    );
    const visualProfile = publicProfileViewPropsMock.mock.calls[0]?.[0].profile;
    expect(visualProfile).not.toHaveProperty("avatar_path");
    expect(visualProfile).not.toHaveProperty("user_id");
    expect(JSON.stringify(visualProfile)).not.toContain(profile.user_id);
  });

  it("uses the not-found convention for a missing or private profile", async () => {
    getPublicProfileMock.mockResolvedValue(null);

    await expect(
      DeveloperProfilePage({
        params: Promise.resolve({ username: "private" }),
      }),
    ).rejects.toThrow("not-found");
    expect(notFoundMock).toHaveBeenCalledOnce();
    expect(getPublishedProjectsByOwnerMock).not.toHaveBeenCalled();
    expect(getProjectImagePublicUrlMock).not.toHaveBeenCalled();
  });

  it("keeps the corrected public empty state when the owner has no published work", async () => {
    getPublicProfileMock.mockResolvedValue(profile);
    getAvatarPublicUrlMock.mockResolvedValue(null);

    render(
      await DeveloperProfilePage({
        params: Promise.resolve({ username: "wajeehanadeem" }),
      }),
    );

    expect(screen.getByText("No published projects yet.")).toBeInTheDocument();
    expect(
      screen.getByText("This developer has not published any projects yet."),
    ).toBeInTheDocument();
    expect(getProjectImagePublicUrlMock).not.toHaveBeenCalled();
  });

  it("generates profile-aware metadata with a safe fallback", async () => {
    getPublicProfileMock.mockResolvedValueOnce(profile).mockResolvedValueOnce(null);

    await expect(
      generateMetadata({
        params: Promise.resolve({ username: "wajeehanadeem" }),
      }),
    ).resolves.toEqual({
      description: "Building reliable web products.",
      title: "Wajeeha Nadeem (@wajeehanadeem)",
    });
    await expect(
      generateMetadata({ params: Promise.resolve({ username: "missing" }) }),
    ).resolves.toEqual({ title: "Developer profile" });
  });
});
