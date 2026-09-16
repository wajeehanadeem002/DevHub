import { beforeEach, describe, expect, it, vi } from "vitest";

const { createCurrentProfileMock, redirectMock } = vi.hoisted(() => ({
  createCurrentProfileMock: vi.fn(),
  redirectMock: vi.fn((destination: string): never => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("./current-profile", () => ({
  createCurrentProfile: createCurrentProfileMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { completeProfileOnboarding } from "./onboarding-action";
import { initialOnboardingActionState } from "./onboarding-state";

function validFormData() {
  const formData = new FormData();
  formData.set("username", "alexmorgan");
  formData.set("displayName", "Alex Morgan");
  formData.set("headline", "Full Stack Developer");
  formData.set("bio", "Building useful products for the web.");
  formData.set("location", "Lahore, Pakistan");
  return formData;
}

describe("completeProfileOnboarding", () => {
  beforeEach(() => {
    createCurrentProfileMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns field errors without attempting persistence", async () => {
    const formData = validFormData();
    formData.set("username", "bad-name");

    await expect(
      completeProfileOnboarding(initialOnboardingActionState, formData),
    ).resolves.toEqual(
      expect.objectContaining({
        fieldErrors: {
          username: ["Use 3–30 lowercase letters, numbers, or underscores."],
        },
        status: "error",
      }),
    );
    expect(createCurrentProfileMock).not.toHaveBeenCalled();
  });

  it("reports an unavailable username from the atomic database check", async () => {
    createCurrentProfileMock.mockResolvedValue("username-taken");

    await expect(
      completeProfileOnboarding(
        initialOnboardingActionState,
        validFormData(),
      ),
    ).resolves.toEqual({
      fieldErrors: { username: ["That username is already taken."] },
      message: "Choose a different username to continue.",
      status: "error",
    });
  });

  it("returns a safe retry message when profile persistence fails", async () => {
    createCurrentProfileMock.mockRejectedValue(
      new Error("Unable to create the developer profile."),
    );

    await expect(
      completeProfileOnboarding(
        initialOnboardingActionState,
        validFormData(),
      ),
    ).resolves.toEqual({
      fieldErrors: {},
      message: "We couldn't create your profile. Please try again.",
      status: "error",
    });
  });

  it("redirects a successfully onboarded developer to the dashboard", async () => {
    createCurrentProfileMock.mockResolvedValue("created");

    await expect(
      completeProfileOnboarding(
        initialOnboardingActionState,
        validFormData(),
      ),
    ).rejects.toThrow("redirect:/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });
});
