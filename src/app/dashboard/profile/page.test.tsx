import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  getAvatarPublicUrlMock,
  getCurrentProfileMock,
  getTechnologyOptionsMock,
  redirectMock,
} = vi.hoisted(() => ({
  getAvatarPublicUrlMock: vi.fn(),
  getCurrentProfileMock: vi.fn(),
  getTechnologyOptionsMock: vi.fn(),
  redirectMock: vi.fn((destination: string): never => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("@/features/profile/avatar-storage", () => ({
  getAvatarPublicUrl: getAvatarPublicUrlMock,
}));
vi.mock("@/features/profile/current-profile", () => ({
  getCurrentProfile: getCurrentProfileMock,
  getTechnologyOptions: getTechnologyOptionsMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import ProfileSettingsPage from "./page";

const currentProfile = {
  avatar_path: null,
  bio: "Building thoughtful web products.",
  display_name: "Wajeeha Nadeem",
  github_url: null,
  headline: "Full Stack Developer",
  is_public: true,
  linkedin_url: null,
  location: "Lahore, Pakistan",
  technologyIds: [1],
  user_id: "user_clerk_123",
  username: "wajeehanadeem",
  website_url: null,
};

describe("ProfileSettingsPage", () => {
  it("loads the current profile and curated technology options", async () => {
    getCurrentProfileMock.mockResolvedValue({
      profile: currentProfile,
      userId: "user_clerk_123",
    });
    getTechnologyOptionsMock.mockResolvedValue([
      { id: 1, name: "React", slug: "react" },
    ]);
    getAvatarPublicUrlMock.mockResolvedValue(null);

    render(await ProfileSettingsPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Profile settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Dashboard navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByLabelText("Username")).toHaveValue("wajeehanadeem");
    expect(screen.getByRole("checkbox", { name: "React" })).toBeChecked();
    expect(screen.getByRole("heading", { level: 2, name: "Profile avatar" })).toBeInTheDocument();
  });

  it("redirects an authenticated user without a profile to onboarding", async () => {
    getCurrentProfileMock.mockResolvedValue({
      profile: null,
      userId: "user_clerk_123",
    });
    getTechnologyOptionsMock.mockResolvedValue([]);

    await expect(ProfileSettingsPage()).rejects.toThrow("redirect:/onboarding");
  });
});
