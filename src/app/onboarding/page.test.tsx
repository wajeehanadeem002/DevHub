import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentProfileMock, redirectMock, requireUserMock } = vi.hoisted(
  () => ({
    getCurrentProfileMock: vi.fn(),
    redirectMock: vi.fn((destination: string): never => {
      throw new Error(`redirect:${destination}`);
    }),
    requireUserMock: vi.fn(),
  }),
);

vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/features/profile/current-profile", () => ({
  getCurrentProfile: getCurrentProfileMock,
}));
vi.mock("@/features/profile/onboarding-action", () => ({
  completeProfileOnboarding: vi.fn(),
  initialOnboardingActionState: {
    fieldErrors: {},
    message: "",
    status: "idle",
  },
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import OnboardingPage from "./page";

describe("OnboardingPage", () => {
  beforeEach(() => {
    getCurrentProfileMock.mockReset();
    redirectMock.mockClear();
    requireUserMock.mockReset();
    requireUserMock.mockResolvedValue({ userId: "user_clerk_123" });
  });

  it("shows profile setup to an authenticated developer without a profile", async () => {
    getCurrentProfileMock.mockResolvedValue({
      profile: null,
      userId: "user_clerk_123",
    });

    render(await OnboardingPage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Create your DevHub profile",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create profile" })).toBeEnabled();
  });

  it("sends an already-onboarded developer to the dashboard", async () => {
    getCurrentProfileMock.mockResolvedValue({
      profile: {
        display_name: "Alex Morgan",
        headline: "Full Stack Developer",
        user_id: "user_clerk_123",
        username: "alexmorgan",
      },
      userId: "user_clerk_123",
    });

    await expect(OnboardingPage()).rejects.toThrow("redirect:/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });
});
