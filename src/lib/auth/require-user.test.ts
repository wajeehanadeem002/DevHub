import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((destination: string): never => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import { requireUser } from "./require-user";

describe("requireUser", () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns the Clerk subject for an authenticated request", async () => {
    authMock.mockResolvedValue({ userId: "user_clerk_123" });

    await expect(requireUser()).resolves.toEqual({
      userId: "user_clerk_123",
    });
  });

  it("redirects an unauthenticated request to sign in", async () => {
    authMock.mockResolvedValue({ userId: null });

    await expect(requireUser()).rejects.toThrow("redirect:/sign-in");
    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });
});
