import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabaseClientMock,
  profileMaybeSingleMock,
  profileTechnologiesOrderMock,
  technologiesOrderMock,
} = vi.hoisted(() => ({
  createServerSupabaseClientMock: vi.fn(),
  profileMaybeSingleMock: vi.fn(),
  profileTechnologiesOrderMock: vi.fn(),
  technologiesOrderMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import { getPublicProfile } from "./public-profile";

describe("getPublicProfile", () => {
  beforeEach(() => {
    const publicFilter = {
      eq: vi.fn(() => ({
        is: vi.fn(() => ({ maybeSingle: profileMaybeSingleMock })),
      })),
    };
    createServerSupabaseClientMock.mockReset();
    profileMaybeSingleMock.mockReset();
    profileTechnologiesOrderMock.mockReset();
    technologiesOrderMock.mockReset();
    createServerSupabaseClientMock.mockResolvedValue({
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({ eq: vi.fn(() => publicFilter) }),
          };
        }
        if (table === "profile_technologies") {
          return {
            select: () => ({
              eq: () => ({ order: profileTechnologiesOrderMock }),
            }),
          };
        }
        if (table === "technologies") {
          return {
            select: () => ({
              in: () => ({ order: technologiesOrderMock }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    });
  });

  it("returns a visible profile with ordered curated technologies", async () => {
    profileMaybeSingleMock.mockResolvedValue({
      data: {
        avatar_path: null,
        bio: "Building developer tools.",
        display_name: "Alex Morgan",
        github_url: "https://github.com/alex",
        headline: "Full Stack Developer",
        linkedin_url: null,
        location: "Lahore, Pakistan",
        private_note: "must-not-leak",
        user_id: "user_alex",
        username: "alexmorgan",
        website_url: "https://alex.dev",
      },
      error: null,
    });
    profileTechnologiesOrderMock.mockResolvedValue({
      data: [{ technology_id: 2 }, { technology_id: 1 }],
      error: null,
    });
    technologiesOrderMock.mockResolvedValue({
      data: [
        { id: 1, name: "React", slug: "react" },
        { id: 2, name: "Next.js", slug: "next-js" },
      ],
      error: null,
    });

    await expect(getPublicProfile(" AlexMorgan ")).resolves.toEqual({
      avatar_path: null,
      bio: "Building developer tools.",
      display_name: "Alex Morgan",
      github_url: "https://github.com/alex",
      headline: "Full Stack Developer",
      linkedin_url: null,
      location: "Lahore, Pakistan",
      technologies: [
        { id: 1, name: "React", slug: "react" },
        { id: 2, name: "Next.js", slug: "next-js" },
      ],
      user_id: "user_alex",
      username: "alexmorgan",
      website_url: "https://alex.dev",
    });
  });

  it("returns null for a missing or private profile without querying technologies", async () => {
    profileMaybeSingleMock.mockResolvedValue({ data: null, error: null });

    await expect(getPublicProfile("alexmorgan")).resolves.toBeNull();
    expect(profileTechnologiesOrderMock).not.toHaveBeenCalled();
  });

  it("keeps provider failures behind a safe server error", async () => {
    profileMaybeSingleMock.mockResolvedValue({
      data: null,
      error: { message: "provider detail" },
    });

    const error = await getPublicProfile("alexmorgan").catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Unable to load this developer profile.",
    );
    expect((error as Error).message).not.toContain("provider detail");
  });

  it("masks a profile client-construction failure with the exact safe error", async () => {
    createServerSupabaseClientMock.mockRejectedValue(
      new Error("sensitive provider detail"),
    );

    const error = await getPublicProfile("alexmorgan").catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Unable to load this developer profile.",
    );
    expect((error as Error).message).not.toContain("sensitive provider detail");
  });

  it("short-circuits curated technology lookup when the profile has no selections", async () => {
    profileMaybeSingleMock.mockResolvedValue({
      data: {
        avatar_path: null,
        bio: null,
        display_name: "Alex Morgan",
        github_url: null,
        headline: null,
        linkedin_url: null,
        location: null,
        user_id: "user_alex",
        username: "alexmorgan",
        website_url: null,
      },
      error: null,
    });
    profileTechnologiesOrderMock.mockResolvedValue({ data: [], error: null });

    await expect(getPublicProfile("alexmorgan")).resolves.toMatchObject({
      technologies: [],
    });
    expect(technologiesOrderMock).not.toHaveBeenCalled();
  });

  it.each([
    ["technology selections", profileTechnologiesOrderMock],
    ["technologies", technologiesOrderMock],
  ])("keeps %s provider failures behind the exact safe error", async (_stage, failingMock) => {
    profileMaybeSingleMock.mockResolvedValue({
      data: {
        avatar_path: null,
        bio: null,
        display_name: "Alex Morgan",
        github_url: null,
        headline: null,
        linkedin_url: null,
        location: null,
        user_id: "user_alex",
        username: "alexmorgan",
        website_url: null,
      },
      error: null,
    });
    profileTechnologiesOrderMock.mockResolvedValue({
      data: [{ technology_id: 1 }],
      error: null,
    });
    technologiesOrderMock.mockResolvedValue({
      data: [{ id: 1, name: "React", slug: "react" }],
      error: null,
    });
    failingMock.mockResolvedValue({
      data: null,
      error: { message: "sensitive provider detail" },
    });

    const error = await getPublicProfile("alexmorgan").catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Unable to load this developer profile.",
    );
    expect((error as Error).message).not.toContain("sensitive provider detail");
  });
});
