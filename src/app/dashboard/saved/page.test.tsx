import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DiscoverableProject } from "@/features/projects/project-discovery";
import type { ResolvedDiscoverableProject } from "@/features/projects/project-discovery-card-data";

const {
  getAvatarPublicUrlMock,
  getCurrentSavedProjectsMock,
  requireProfileMock,
  resolveDiscoverableProjectsMock,
  savedProjectsViewPropsMock,
} = vi.hoisted(() => ({
  getAvatarPublicUrlMock: vi.fn(),
  getCurrentSavedProjectsMock: vi.fn(),
  requireProfileMock: vi.fn(),
  resolveDiscoverableProjectsMock: vi.fn(),
  savedProjectsViewPropsMock: vi.fn(),
}));

vi.mock("@/lib/auth/require-profile", () => ({
  requireProfile: requireProfileMock,
}));
vi.mock("@/features/profile/avatar-storage", () => ({
  getAvatarPublicUrl: getAvatarPublicUrlMock,
}));
vi.mock("@/features/projects/project-discovery", () => ({
  getCurrentSavedProjects: getCurrentSavedProjectsMock,
}));
vi.mock("@/features/projects/project-discovery-card-data", () => ({
  resolveDiscoverableProjects: resolveDiscoverableProjectsMock,
}));
vi.mock("@/features/projects/saved-projects-view", () => ({
  SavedProjectsView: (props: unknown) => {
    savedProjectsViewPropsMock(props);
    return null;
  },
}));

import SavedProjectsPage from "./page";

const profile = {
  avatar_path: "private-user/avatar.webp",
  display_name: "Wajeeha Nadeem",
  headline: "Full Stack Developer",
  is_public: false,
  user_id: "user_private_clerk_id",
  username: "wajeehanadeem",
};
const avatarUrl = "https://cdn.test/current-avatar.webp";
const rawProjects: DiscoverableProject[] = [{
  category: null,
  coverImage: {
    alt_text: "TaskFlow board",
    height: 720,
    id: "cover-id",
    sort_order: 0,
    storage_path: "private-owner/project/cover.webp",
    width: 1280,
  },
  id: "saved-project",
  like_count: 12,
  owner: {
    avatar_path: "private-owner/avatar.webp",
    display_name: "Alex Morgan",
    headline: "Developer",
    username: "alexmorgan",
  },
  published_at: "2026-09-15T10:00:00.000Z",
  summary: "Build and ship focused work.",
  technologies: [{ id: 1, name: "React", slug: "react" }],
  title: "TaskFlow",
}];
const resolvedProjects: ResolvedDiscoverableProject[] = [{
  category: null,
  coverImage: {
    alt_text: "TaskFlow board",
    height: 720,
    id: "cover-id",
    sort_order: 0,
    width: 1280,
  },
  coverImageUrl: "https://cdn.test/cover.webp",
  id: "saved-project",
  like_count: 12,
  owner: {
    avatarUrl: "https://cdn.test/owner.webp",
    display_name: "Alex Morgan",
    username: "alexmorgan",
  },
  published_at: "2026-09-15T10:00:00.000Z",
  summary: "Build and ship focused work.",
  technologies: [{ id: 1, name: "React", slug: "react" }],
  title: "TaskFlow",
}];

describe("SavedProjectsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireProfileMock.mockResolvedValue({ profile, userId: profile.user_id });
    getAvatarPublicUrlMock.mockResolvedValue(avatarUrl);
    getCurrentSavedProjectsMock.mockResolvedValue(rawProjects);
    resolveDiscoverableProjectsMock.mockResolvedValue(resolvedProjects);
  });

  it("passes only resolved project data and the navigation profile to the view", async () => {
    const page = await SavedProjectsPage();
    const expectedProps = {
      profile: {
        avatarUrl,
        displayName: profile.display_name,
        isPublic: profile.is_public,
        username: profile.username,
      },
      projects: resolvedProjects,
    };
    expect(page.props).toEqual(expectedProps);
    render(page);

    expect(requireProfileMock).toHaveBeenCalledOnce();
    expect(getCurrentSavedProjectsMock).toHaveBeenCalledOnce();
    expect(getAvatarPublicUrlMock).toHaveBeenCalledWith(profile.avatar_path);
    expect(resolveDiscoverableProjectsMock).toHaveBeenCalledWith(rawProjects);
    expect(savedProjectsViewPropsMock).toHaveBeenCalledWith(expectedProps);
    const serializedProps = JSON.stringify(
      savedProjectsViewPropsMock.mock.calls[0]?.[0],
    );
    for (const privateValue of [
      profile.user_id,
      profile.avatar_path,
      "private-owner/avatar.webp",
      "private-owner/project/cover.webp",
      "avatar_path",
      "storage_path",
      "userId",
      "user_id",
    ]) {
      expect(serializedProps).not.toContain(privateValue);
    }
  });

  it("starts the avatar and saved query concurrently before resolving project media", async () => {
    let resolveAvatar!: (value: string) => void;
    let resolveProjects!: (value: DiscoverableProject[]) => void;
    getAvatarPublicUrlMock.mockReturnValue(
      new Promise<string>((resolve) => { resolveAvatar = resolve; }),
    );
    getCurrentSavedProjectsMock.mockReturnValue(
      new Promise<DiscoverableProject[]>((resolve) => { resolveProjects = resolve; }),
    );

    const pendingPage = SavedProjectsPage();
    await vi.waitFor(() => {
      expect(getCurrentSavedProjectsMock).toHaveBeenCalledOnce();
      expect(getAvatarPublicUrlMock).toHaveBeenCalledOnce();
    });
    expect(resolveDiscoverableProjectsMock).not.toHaveBeenCalled();
    resolveAvatar(avatarUrl);
    resolveProjects(rawProjects);
    const page = await pendingPage;
    expect(page.props.projects).toBe(resolvedProjects);
  });

  it("stops before reading saved projects or media when profile protection rejects", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    requireProfileMock.mockRejectedValue(redirect);

    await expect(SavedProjectsPage()).rejects.toBe(redirect);
    expect(getCurrentSavedProjectsMock).not.toHaveBeenCalled();
    expect(getAvatarPublicUrlMock).not.toHaveBeenCalled();
    expect(resolveDiscoverableProjectsMock).not.toHaveBeenCalled();
    expect(savedProjectsViewPropsMock).not.toHaveBeenCalled();
  });
});
