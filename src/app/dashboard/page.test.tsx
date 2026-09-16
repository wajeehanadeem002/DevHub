import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { getAvatarPublicUrlMock, requireProfileMock } = vi.hoisted(() => ({
  getAvatarPublicUrlMock: vi.fn(),
  requireProfileMock: vi.fn(),
}));

vi.mock("@/lib/auth/require-profile", () => ({
  requireProfile: requireProfileMock,
}));
vi.mock("@/features/profile/avatar-storage", () => ({
  getAvatarPublicUrl: getAvatarPublicUrlMock,
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders a protected dashboard shell with the current profile identity", async () => {
    getAvatarPublicUrlMock.mockResolvedValue(
      "https://example.supabase.co/storage/v1/object/public/avatars/user/avatar.jpg",
    );
    requireProfileMock.mockResolvedValue({
      profile: {
        avatar_path: "user_clerk_123/avatar.jpg",
        display_name: "Alex Morgan",
        headline: "Full Stack Developer",
        is_public: true,
        user_id: "user_clerk_123",
        username: "alexmorgan",
      },
      userId: "user_clerk_123",
    });

    render(await DashboardPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome, Alex." }),
    ).toBeInTheDocument();
    expect(screen.getByText("@alexmorgan")).toBeInTheDocument();
    expect(screen.getByText("Full Stack Developer")).toBeInTheDocument();
    expect(screen.getByText("Profile ready")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute(
      "href",
      "/dashboard/profile",
    );
    expect(
      screen.getByRole("link", { name: "View public profile" }),
    ).toHaveAttribute("href", "/developers/alexmorgan");
    expect(
      screen.getByRole("heading", { level: 2, name: "Project workspace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open project workspace" }),
    ).toHaveAttribute("href", "/dashboard/projects");
    expect(
      screen.queryByText(/project creation is intentionally reserved/i),
    ).toBeNull();
    expect(
      screen.getByRole("navigation", { name: "Dashboard navigation" }),
    ).toBeInTheDocument();
  });

  it("uses the full display name when no first-name segment exists", async () => {
    getAvatarPublicUrlMock.mockResolvedValue(null);
    requireProfileMock.mockResolvedValue({
      profile: {
        avatar_path: null,
        display_name: "Wajeeha",
        headline: null,
        is_public: false,
        user_id: "user_clerk_456",
        username: "wajeeha",
      },
      userId: "user_clerk_456",
    });

    render(await DashboardPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome, Wajeeha." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Developer profile")).toBeInTheDocument();
  });
});
