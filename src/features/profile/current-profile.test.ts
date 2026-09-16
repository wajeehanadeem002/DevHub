import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabaseClientMock,
  fromMock,
  insertMock,
  profileMaybeSingleMock,
  profileTechnologiesOrderMock,
  requireUserMock,
  rpcMock,
  technologiesOrderMock,
} = vi.hoisted(() => ({
  createServerSupabaseClientMock: vi.fn(),
  fromMock: vi.fn(),
  insertMock: vi.fn(),
  profileMaybeSingleMock: vi.fn(),
  profileTechnologiesOrderMock: vi.fn(),
  requireUserMock: vi.fn(),
  rpcMock: vi.fn(),
  technologiesOrderMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import {
  createCurrentProfile,
  getCurrentProfile,
  getTechnologyOptions,
  updateCurrentProfile,
} from "./current-profile";

const profileInput = {
  bio: "I build useful products.",
  display_name: "Alex Morgan",
  headline: "Full Stack Developer",
  is_public: true as const,
  location: "Lahore, Pakistan",
  username: "alexmorgan",
};

const completeProfile = {
  avatar_path: "user_clerk_123/avatar.jpg",
  bio: "I build useful products.",
  display_name: "Alex Morgan",
  github_url: "https://github.com/alex",
  headline: "Full Stack Developer",
  is_public: true,
  linkedin_url: "https://linkedin.com/in/alex",
  location: "Lahore, Pakistan",
  user_id: "user_clerk_123",
  username: "alexmorgan",
  website_url: "https://alex.dev",
};

describe("current profile data boundary", () => {
  beforeEach(() => {
    requireUserMock.mockReset();
    createServerSupabaseClientMock.mockReset();
    fromMock.mockReset();
    insertMock.mockReset();
    profileMaybeSingleMock.mockReset();
    profileTechnologiesOrderMock.mockReset();
    rpcMock.mockReset();
    technologiesOrderMock.mockReset();

    requireUserMock.mockResolvedValue({ userId: "user_clerk_123" });
    createServerSupabaseClientMock.mockResolvedValue({
      from: fromMock,
      rpc: rpcMock,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          insert: insertMock,
          select: () => ({
            eq: () => ({ maybeSingle: profileMaybeSingleMock }),
          }),
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
          select: () => ({ order: technologiesOrderMock }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it("returns the complete editable profile and selected technology IDs", async () => {
    profileMaybeSingleMock.mockResolvedValue({ data: completeProfile, error: null });
    profileTechnologiesOrderMock.mockResolvedValue({
      data: [{ technology_id: 1 }, { technology_id: 3 }],
      error: null,
    });

    await expect(getCurrentProfile()).resolves.toEqual({
      profile: { ...completeProfile, technologyIds: [1, 3] },
      userId: "user_clerk_123",
    });
  });

  it("does not treat a database failure as an incomplete profile", async () => {
    profileMaybeSingleMock.mockResolvedValue({
      data: null,
      error: { code: "08006", message: "connection failure" },
    });

    await expect(getCurrentProfile()).rejects.toThrow(
      "Unable to load the current developer profile.",
    );
  });

  it("returns ordered curated technology options", async () => {
    technologiesOrderMock.mockResolvedValue({
      data: [
        { id: 1, name: "React", slug: "react" },
        { id: 2, name: "Next.js", slug: "next-js" },
      ],
      error: null,
    });

    await expect(getTechnologyOptions()).resolves.toEqual([
      { id: 1, name: "React", slug: "react" },
      { id: 2, name: "Next.js", slug: "next-js" },
    ]);
  });

  it("creates a profile using the Clerk identity supplied by database defaults", async () => {
    insertMock.mockResolvedValue({ error: null });

    await expect(createCurrentProfile(profileInput)).resolves.toBe("created");
    expect(insertMock).toHaveBeenCalledWith(profileInput);
    expect(insertMock.mock.calls[0]?.[0]).not.toHaveProperty("user_id");
  });

  it("maps onboarding and editing username conflicts to an explicit result", async () => {
    insertMock.mockResolvedValue({
      error: { code: "23505", message: "duplicate key value" },
    });
    rpcMock.mockResolvedValue({
      error: { code: "23505", message: "duplicate key value" },
    });

    await expect(createCurrentProfile(profileInput)).resolves.toBe("username-taken");
    await expect(
      updateCurrentProfile({ ...completeProfile, technologyIds: [1, 3] }),
    ).resolves.toBe("username-taken");
  });

  it("maps editable fields to the atomic profile RPC", async () => {
    rpcMock.mockResolvedValue({ error: null });
    const input = {
      bio: completeProfile.bio,
      display_name: completeProfile.display_name,
      github_url: completeProfile.github_url,
      headline: completeProfile.headline,
      is_public: completeProfile.is_public,
      linkedin_url: completeProfile.linkedin_url,
      location: completeProfile.location,
      technologyIds: [1, 3],
      username: completeProfile.username,
      website_url: completeProfile.website_url,
    };

    await expect(updateCurrentProfile(input)).resolves.toBe("updated");
    expect(rpcMock).toHaveBeenCalledWith("update_current_profile", {
      p_bio: "I build useful products.",
      p_display_name: "Alex Morgan",
      p_github_url: "https://github.com/alex",
      p_headline: "Full Stack Developer",
      p_is_public: true,
      p_linkedin_url: "https://linkedin.com/in/alex",
      p_location: "Lahore, Pakistan",
      p_technology_ids: [1, 3],
      p_username: "alexmorgan",
      p_website_url: "https://alex.dev",
    });
  });
});
