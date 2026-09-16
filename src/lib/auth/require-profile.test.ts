import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerSupabaseClientMock, redirectMock, requireUserMock } =
  vi.hoisted(() => ({
    createServerSupabaseClientMock: vi.fn(),
    redirectMock: vi.fn((destination: string): never => {
      throw new Error(`redirect:${destination}`);
    }),
    requireUserMock: vi.fn(),
  }));

let selectedProfileColumns = "";

vi.mock("server-only", () => ({}));
vi.mock("./require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { requireProfile } from "./require-profile";

function profileQueryResult(result: {
  data: {
    avatar_path: string | null;
    display_name: string;
    headline: string | null;
    is_public: boolean;
    user_id: string;
    username: string;
  } | null;
  error: { message: string } | null;
}) {
  return {
    from: () => ({
      select: (columns: string) => {
        selectedProfileColumns = columns;
        return {
          eq: () => ({
            maybeSingle: async () => result,
          }),
        };
      },
    }),
  };
}

describe("requireProfile", () => {
  beforeEach(() => {
    requireUserMock.mockReset();
    createServerSupabaseClientMock.mockReset();
    redirectMock.mockClear();
    selectedProfileColumns = "";
    requireUserMock.mockResolvedValue({ userId: "user_clerk_123" });
  });

  it("returns the current user's profile boundary data", async () => {
    createServerSupabaseClientMock.mockResolvedValue(
      profileQueryResult({
        data: {
          avatar_path: "user_clerk_123/avatar.jpg",
          display_name: "Alex Morgan",
          headline: "Full Stack Developer",
          is_public: true,
          user_id: "user_clerk_123",
          username: "alexmorgan",
        },
        error: null,
      }),
    );

    await expect(requireProfile()).resolves.toEqual({
      userId: "user_clerk_123",
      profile: {
        avatar_path: "user_clerk_123/avatar.jpg",
        display_name: "Alex Morgan",
        headline: "Full Stack Developer",
        is_public: true,
        user_id: "user_clerk_123",
        username: "alexmorgan",
      },
    });
    expect(selectedProfileColumns).toBe(
      "user_id, username, display_name, headline, avatar_path, is_public",
    );
  });

  it("redirects an authenticated user without a profile to onboarding", async () => {
    createServerSupabaseClientMock.mockResolvedValue(
      profileQueryResult({ data: null, error: null }),
    );

    await expect(requireProfile()).rejects.toThrow("redirect:/onboarding");
    expect(redirectMock).toHaveBeenCalledWith("/onboarding");
  });

  it("does not misclassify a database failure as missing onboarding", async () => {
    createServerSupabaseClientMock.mockResolvedValue(
      profileQueryResult({
        data: null,
        error: { message: "database unavailable" },
      }),
    );

    await expect(requireProfile()).rejects.toThrow(
      "Unable to verify the current developer profile.",
    );
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
